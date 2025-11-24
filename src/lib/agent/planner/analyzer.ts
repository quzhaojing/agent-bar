/**
 * Prompt Analyzer and Task Decomposition
 *
 * 这个文件负责分析用户输入的 prompt，并将其分解为可执行的任务
 */

import type {
  PlanningRequest,
  TaskTemplate,
  PlannedTask,
} from './types';
import { TaskPriority } from './types';
import { AgentUtils } from './utils';
import { BrowserTaskAnalyzer, BrowserTaskTemplate, PageAnalysis } from './browser-analyzer';

/**
 * Prompt 分析器
 */
export class PromptAnalyzer {
  private taskTemplates: Map<string, TaskTemplate> = new Map();
  private browserAnalyzer: BrowserTaskAnalyzer;
  private pageAnalysis: PageAnalysis | null = null;

  constructor() {
    this.initializeTaskTemplates();
    this.browserAnalyzer = new BrowserTaskAnalyzer();
  }

  /**
   * 初始化任务模板
   */
  private initializeTaskTemplates(): void {
    // 文本处理模板
    this.addTaskTemplate({
      id: 'summarize_template',
      name: '文本摘要',
      description: '对文本内容进行摘要',
      keywords: ['摘要', '总结', '概括', '总结一下', 'summarize', 'summary'],
      taskType: 'summarize_text',
      parameterMapping: {
        text: {
          source: 'prompt',
          extraction: 'extract_text_content',
          required: true
        },
        length: {
          source: 'prompt',
          extraction: 'extract_length_preference',
          required: false
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 5000,
      canRunInParallel: true
    });

    // 翻译模板
    this.addTaskTemplate({
      id: 'translate_template',
      name: '文本翻译',
      description: '将文本翻译到指定语言',
      keywords: ['翻译', 'translate', 'translation', '译文', '翻译成', '译为'],
      taskType: 'translate_text',
      parameterMapping: {
        text: {
          source: 'prompt',
          extraction: 'extract_text_content',
          required: true
        },
        targetLanguage: {
          source: 'prompt',
          extraction: 'extract_target_language',
          required: true
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 3000,
      canRunInParallel: true
    });

    // 内容分析模板
    this.addTaskTemplate({
      id: 'analyze_template',
      name: '内容分析',
      description: '分析内容的各个方面',
      keywords: ['分析', 'analyze', 'analysis', '解析', '评估', 'evaluation'],
      taskType: 'content_analysis',
      parameterMapping: {
        content: {
          source: 'prompt',
          extraction: 'extract_text_content',
          required: true
        },
        aspects: {
          source: 'prompt',
          extraction: 'extract_analysis_aspects',
          required: false
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 8000,
      canRunInParallel: true
    });

    // 代码生成模板
    this.addTaskTemplate({
      id: 'code_template',
      name: '代码生成',
      description: '根据描述生成代码',
      keywords: ['代码', '编程', 'code', 'program', '实现', '开发', '函数', '类'],
      taskType: 'generate_code',
      parameterMapping: {
        description: {
          source: 'prompt',
          extraction: 'extract_functionality_description',
          required: true
        },
        language: {
          source: 'prompt',
          extraction: 'extract_programming_language',
          required: false
        }
      },
      priority: TaskPriority.HIGH,
      estimatedDuration: 10000,
      canRunInParallel: false
    });

    // 数据提取模板
    this.addTaskTemplate({
      id: 'extract_template',
      name: '数据提取',
      description: '从文本中提取特定信息',
      keywords: ['提取', 'extract', '识别', '找出', '获取', '关键词', '实体'],
      taskType: 'extract_keywords',
      parameterMapping: {
        text: {
          source: 'prompt',
          extraction: 'extract_text_content',
          required: true
        },
        count: {
          source: 'prompt',
          extraction: 'extract_count_preference',
          required: false
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 4000,
      canRunInParallel: true
    });

    // 情感分析模板
    this.addTaskTemplate({
      id: 'sentiment_template',
      name: '情感分析',
      description: '分析文本的情感倾向',
      keywords: ['情感', '情绪', 'sentiment', 'emotion', '感受', '态度', '积极', '消极'],
      taskType: 'sentiment_analysis',
      parameterMapping: {
        text: {
          source: 'prompt',
          extraction: 'extract_text_content',
          required: true
        },
        detailLevel: {
          source: 'prompt',
          extraction: 'extract_detail_level',
          required: false
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 3000,
      canRunInParallel: true
    });

    // 内容生成模板
    this.addTaskTemplate({
      id: 'generate_template',
      name: '内容生成',
      description: '根据要求生成新内容',
      keywords: ['生成', '创建', '写', 'generate', 'create', 'write', '产生'],
      taskType: 'generate_title',
      parameterMapping: {
        content: {
          source: 'prompt',
          extraction: 'extract_content_description',
          required: true
        },
        count: {
          source: 'prompt',
          extraction: 'extract_count_preference',
          required: false
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 6000,
      canRunInParallel: true
    });
  }

  /**
   * 添加任务模板
   */
  addTaskTemplate(template: TaskTemplate): void {
    this.taskTemplates.set(template.id, template);
  }

  /**
   * 分析 prompt 并识别相关任务
   */
  async analyzePrompt(request: PlanningRequest): Promise<PlannedTask[]> {
    const { prompt, context } = request;
    const plannedTasks: PlannedTask[] = [];

    // 0. 分析页面（如果在浏览器环境中）
    if (typeof window !== 'undefined') {
      this.pageAnalysis = await this.browserAnalyzer.analyzePage();
    }

    // 1. 提取关键信息
    const extractedInfo = this.extractKeyInformation(prompt, context);

    // 2. 识别潜在任务（包括普通任务和浏览器任务）
    const identifiedTasks = this.identifyPotentialTasks(prompt, extractedInfo);

    // 3. 识别浏览器操作任务
    const browserTasks = await this.identifyBrowserTasks(prompt);

    // 4. 为每个识别的任务创建计划任务
    for (const identifiedTask of identifiedTasks) {
      const plannedTask = await this.createPlannedTask(
        identifiedTask,
        request,
        extractedInfo,
        plannedTasks.length
      );

      if (plannedTask) {
        plannedTasks.push(plannedTask);
      }
    }

    // 5. 为每个浏览器任务创建计划任务
    for (const browserTask of browserTasks) {
      const plannedTask = await this.createBrowserPlannedTask(
        browserTask,
        request,
        extractedInfo,
        plannedTasks.length
      );

      if (plannedTask) {
        plannedTasks.push(plannedTask);
      }
    }

    // 6. 分析任务依赖关系
    this.analyzeDependencies(plannedTasks);

    // 7. 优化执行顺序
    this.optimizeExecutionOrder(plannedTasks);

    // 8. 应用约束和偏好
    this.applyConstraints(plannedTasks, request);

    return plannedTasks;
  }

  /**
   * 提取关键信息
   */
  private extractKeyInformation(prompt: string, context?: any): Record<string, any> {
    const info: Record<string, any> = {
      originalPrompt: prompt,
      hasTextContent: /文本|内容|文章|段落/.test(prompt),
      hasCodeRequest: /代码|编程|函数|类|程序/.test(prompt),
      hasAnalysisRequest: /分析|解析|评估/.test(prompt),
      hasTranslationRequest: /翻译|翻译成|translate/.test(prompt),
      hasSummaryRequest: /摘要|总结|概括/.test(prompt),
      hasGenerationRequest: /生成|创建|写/.test(prompt),
      hasBrowserRequest: /点击|输入|滚动|导航|截图|提取/.test(prompt),
      hasClickRequest: /点击|click|选择|按一下/.test(prompt),
      hasTypeRequest: /输入|填写|填入|写入|type/.test(prompt),
      hasScrollRequest: /滚动|scroll|向下滑|向上滑/.test(prompt),
      hasNavigateRequest: /导航|navigate|打开|访问|前往/.test(prompt),
      hasExtractRequest: /提取|extract|获取|抓取|收集/.test(prompt),
      hasScreenshotRequest: /截图|screenshot|拍照|截屏/.test(prompt),
      targetLanguages: this.extractTargetLanguages(prompt),
      programmingLanguages: this.extractProgrammingLanguages(prompt),
      lengthPreferences: this.extractLengthPreferences(prompt),
      analysisAspects: this.extractAnalysisAspects(prompt),
      countPreferences: this.extractCountPreferences(prompt)
    };

    // 从上下文中提取信息
    if (context) {
      info.contextText = context.selectedText || context.currentUrl || '';
      info.pageTitle = context.pageTitle;
      info.currentUrl = context.currentUrl;
    }

    return info;
  }

  /**
   * 识别潜在任务
   */
  private identifyPotentialTasks(prompt: string, extractedInfo: Record<string, any>): TaskTemplate[] {
    const identifiedTasks: TaskTemplate[] = [];
    const promptLower = prompt.toLowerCase();

    // 遍历所有任务模板，检查是否匹配
    for (const template of this.taskTemplates.values()) {
      let matchScore = 0;

      // 关键词匹配
      for (const keyword of template.keywords) {
        if (promptLower.includes(keyword.toLowerCase())) {
          matchScore += keyword.length; // 较长的关键词权重更高
        }
      }

      // 特殊模式匹配
      if (template.id === 'translate_template' && extractedInfo.targetLanguages.length > 0) {
        matchScore += 10;
      }

      if (template.id === 'code_template' && extractedInfo.hasCodeRequest) {
        matchScore += 8;
      }

      if (template.id === 'analyze_template' && extractedInfo.hasAnalysisRequest) {
        matchScore += 8;
      }

      if (template.id === 'summarize_template' && extractedInfo.hasSummaryRequest) {
        matchScore += 8;
      }

      // 如果匹配分数超过阈值，添加到识别的任务中
      if (matchScore >= 3) {
        identifiedTasks.push({
          ...template,
          metadata: { matchScore }
        } as TaskTemplate);
      }
    }

    // 按匹配分数排序
    identifiedTasks.sort((a, b) =>
      (b.metadata?.matchScore || 0) - (a.metadata?.matchScore || 0)
    );

    return identifiedTasks.slice(0, 5); // 最多返回5个任务
  }

  /**
   * 创建计划任务
   */
  private async createPlannedTask(
    template: TaskTemplate,
    request: PlanningRequest,
    extractedInfo: Record<string, any>,
    executionOrder: number
  ): Promise<PlannedTask | null> {
    const { prompt, context } = request;

    // 检查任务类型是否可用
    if (!request.availableTasks.find(task => task.id === template.taskType)) {
      return null;
    }

    // 提取参数
    const parameters = this.extractParameters(template, prompt, extractedInfo, context);

    // 创建计划任务
    const plannedTask: PlannedTask = {
      id: AgentUtils.generateId(`task_${template.id}`),
      name: template.name,
      description: template.description,
      taskType: template.taskType,
      parameters,
      priority: template.priority,
      status: 'pending' as any,
      dependencies: [],
      estimatedDuration: template.estimatedDuration,
      maxRetries: 3,
      retryCount: 0,
      createdAt: Date.now(),
      executionOrder,
      canRunInParallel: template.canRunInParallel,
      tags: this.generateTags(template, extractedInfo),
      metadata: {
        templateId: template.id,
        matchScore: template.metadata?.matchScore || 0
      }
    };

    return plannedTask;
  }

  /**
   * 提取任务参数
   */
  private extractParameters(
    template: TaskTemplate,
    prompt: string,
    extractedInfo: Record<string, any>,
    context?: any
  ): Record<string, any> {
    const parameters: Record<string, any> = {};

    for (const [paramName, mapping] of Object.entries(template.parameterMapping)) {
      let value: any;

      switch (mapping.source) {
        case 'prompt':
          value = this.extractFromPrompt(prompt, mapping.extraction, extractedInfo);
          break;
        case 'context':
          value = this.extractFromContext(context, mapping.extraction);
          break;
        case 'constant':
          value = mapping.extraction;
          break;
        case 'previous_task':
          // 这里需要更复杂的逻辑来处理依赖任务的输出
          value = null;
          break;
      }

      if (value !== null && value !== undefined) {
        parameters[paramName] = value;
      } else if (mapping.required) {
        // 对于必需参数，提供默认值或抛出错误
        parameters[paramName] = this.getDefaultValue(paramName, mapping.extraction);
      }
    }

    return parameters;
  }

  /**
   * 从 prompt 中提取值
   */
  private extractFromPrompt(prompt: string, extraction: string, extractedInfo: Record<string, any>): any {
    switch (extraction) {
      case 'extract_text_content':
        // 尝试提取引用的文本内容
        const textMatch = prompt.match(/["'"](.*?)["'"]/) ||
                         prompt.match(/文本[：:]?\s*([^\n]+)/) ||
                         prompt.match(/内容[：:]?\s*([^\n]+)/);
        return textMatch ? textMatch[1].trim() : extractedInfo.contextText || prompt;

      case 'extract_target_language':
        const langMap: Record<string, string> = {
          '中文': '中文', '英文': '英文',
          '日文': '日文', '韩文': '韩文', '法文': '法文', '德文': '德文'
        };
        for (const [key, value] of Object.entries(langMap)) {
          if (prompt.includes(key)) return value;
        }
        return extractedInfo.targetLanguages[0] || '中文';

      case 'extract_programming_language':
        const codeLangMap: Record<string, string> = {
          'javascript': 'JavaScript', 'js': 'JavaScript',
          'python': 'Python', 'java': 'Java', 'cpp': 'C++', 'c++': 'C++',
          'go': 'Go', 'rust': 'Rust', 'typescript': 'TypeScript', 'php': 'PHP'
        };
        for (const [key, value] of Object.entries(codeLangMap)) {
          if (prompt.toLowerCase().includes(key)) return value;
        }
        return 'JavaScript';

      case 'extract_length_preference':
        if (prompt.includes('简短') || prompt.includes('简要')) return '简短';
        if (prompt.includes('详细') || prompt.includes('全面')) return '详细';
        return '中等';

      case 'extract_functionality_description':
        // 提取功能描述部分
        const descMatch = prompt.match(/实现[：:]?\s*([^\n]+)/) ||
                         prompt.match(/功能[：:]?\s*([^\n]+)/) ||
                         prompt.match(/需要[：:]?\s*([^\n]+)/);
        return descMatch ? descMatch[1].trim() : prompt;

      case 'extract_count_preference':
        const countMatch = prompt.match(/(\d+)[个条]/);
        return countMatch ? parseInt(countMatch[1]) : 5;

      case 'extract_analysis_aspects':
        const aspects = [];
        if (prompt.includes('结构')) aspects.push('结构');
        if (prompt.includes('逻辑')) aspects.push('逻辑');
        if (prompt.includes('表达')) aspects.push('表达');
        if (prompt.includes('创新')) aspects.push('创新性');
        if (prompt.includes('实用')) aspects.push('实用性');
        return aspects.length > 0 ? aspects : ['结构', '逻辑', '表达'];

      case 'extract_detail_level':
        if (prompt.includes('详细') || prompt.includes('深入')) return '详细';
        if (prompt.includes('简单') || prompt.includes('简要')) return '简单';
        return '中等';

      case 'extract_content_description':
        // 提取内容描述
        const contentMatch = prompt.match(/内容[：:]?\s*([^\n]+)/) ||
                           prompt.match(/关于[：:]?\s*([^\n]+)/);
        return contentMatch ? contentMatch[1].trim() : prompt;

      default:
        return null;
    }
  }

  /**
   * 从上下文中提取值
   */
  private extractFromContext(context: any, extraction: string): any {
    if (!context) return null;

    switch (extraction) {
      case 'selected_text':
        return context.selectedText;
      case 'current_url':
        return context.currentUrl;
      case 'page_title':
        return context.pageTitle;
      default:
        return null;
    }
  }

  /**
   * 获取默认值
   */
  private getDefaultValue(paramName: string, extraction: string): any {
    const defaults: Record<string, any> = {
      length: '中等',
      targetLanguage: '中文',
      language: 'JavaScript',
      count: 5,
      detailLevel: '中等',
      aspects: ['结构', '逻辑', '表达']
    };

    return defaults[paramName] || defaults[extraction] || null;
  }

  /**
   * 提取目标语言
   */
  private extractTargetLanguages(prompt: string): string[] {
    const languages = [];
    const langPatterns = [
      { pattern: /中文|汉语/, lang: '中文' },
      { pattern: /英文|英语/, lang: '英文' },
      { pattern: /日文|日语/, lang: '日文' },
      { pattern: /韩文|韩语/, lang: '韩文' },
      { pattern: /法文|法语/, lang: '法文' },
      { pattern: /德文|德语/, lang: '德文' }
    ];

    for (const { pattern, lang } of langPatterns) {
      if (pattern.test(prompt)) {
        languages.push(lang);
      }
    }

    return languages;
  }

  /**
   * 提取编程语言
   */
  private extractProgrammingLanguages(prompt: string): string[] {
    const languages = [];
    const langPatterns = [
      { pattern: /javascript|js/, lang: 'JavaScript' },
      { pattern: /python/, lang: 'Python' },
      { pattern: /java/, lang: 'Java' },
      { pattern: /c\+\+|cpp/, lang: 'C++' },
      { pattern: /go/, lang: 'Go' },
      { pattern: /rust/, lang: 'Rust' },
      { pattern: /typescript|ts/, lang: 'TypeScript' },
      { pattern: /php/, lang: 'PHP' }
    ];

    for (const { pattern, lang } of langPatterns) {
      if (pattern.test(prompt.toLowerCase())) {
        languages.push(lang);
      }
    }

    return languages;
  }

  /**
   * 提取长度偏好
   */
  private extractLengthPreferences(prompt: string): string[] {
    const preferences = [];
    if (/简短|简要|精简/.test(prompt)) preferences.push('简短');
    if (/中等|适中/.test(prompt)) preferences.push('中等');
    if (/详细|全面|完整/.test(prompt)) preferences.push('详细');
    return preferences;
  }

  /**
   * 提取分析方面
   */
  private extractAnalysisAspects(prompt: string): string[] {
    const aspects = [];
    if (/结构|组织/.test(prompt)) aspects.push('结构');
    if (/逻辑|推理/.test(prompt)) aspects.push('逻辑');
    if (/表达|语言/.test(prompt)) aspects.push('表达');
    if (/创新|创意/.test(prompt)) aspects.push('创新性');
    if (/实用|应用/.test(prompt)) aspects.push('实用性');
    return aspects;
  }

  /**
   * 提取数量偏好
   */
  private extractCountPreferences(prompt: string): number[] {
    const counts = [];
    const matches = prompt.match(/\d+/g);
    if (matches) {
      for (const match of matches) {
        const num = parseInt(match);
        if (num > 0 && num <= 100) {
          counts.push(num);
        }
      }
    }
    return counts;
  }

  /**
   * 生成标签
   */
  private generateTags(template: TaskTemplate, extractedInfo: Record<string, any>): string[] {
    const tags = [template.name, template.taskType];

    if (extractedInfo.hasTextContent) tags.push('文本处理');
    if (extractedInfo.hasCodeRequest) tags.push('代码相关');
    if (extractedInfo.hasAnalysisRequest) tags.push('分析任务');
    if (extractedInfo.targetLanguages.length > 0) tags.push('翻译');

    return tags;
  }

  /**
   * 分析任务依赖关系
   */
  private analyzeDependencies(tasks: PlannedTask[]): void {
    // 基本依赖关系分析
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // 如果任务需要前一个任务的输出
      if (i > 0 && this.taskDependsOnPrevious(task, tasks[i - 1])) {
        task.dependencies.push({
          taskId: tasks[i - 1].id,
          condition: 'success',
          outputMapping: this.getOutputMapping(task, tasks[i - 1])
        });
      }
    }
  }

  /**
   * 检查任务是否依赖前一个任务
   */
  private taskDependsOnPrevious(current: PlannedTask, previous: PlannedTask): boolean {
    // 简单的依赖规则：某些类型的任务可能需要其他任务的输出
    const dependencyRules: Record<string, string[]> = {
      'generate_title': ['summarize_text', 'content_analysis'],
      'translate_text': ['summarize_text', 'improve_writing'],
      'improve_writing': ['generate_code', 'content_analysis']
    };

    return dependencyRules[current.taskType]?.includes(previous.taskType) || false;
  }

  /**
   * 获取输出映射
   */
  private getOutputMapping(current: PlannedTask, previous: PlannedTask): Record<string, string> {
    const mapping: Record<string, string> = {};

    // 简单的输出映射规则
    if (current.taskType === 'translate_text' && previous.taskType === 'summarize_text') {
      mapping.text = 'data';
    }

    if (current.taskType === 'generate_title' && previous.taskType === 'content_analysis') {
      mapping.content = 'data';
    }

    return mapping;
  }

  /**
   * 优化执行顺序
   */
  private optimizeExecutionOrder(tasks: PlannedTask[]): void {
    // 按优先级和依赖关系排序
    tasks.sort((a, b) => {
      // 首先按依赖关系排序
      if (a.dependencies.length > 0 && b.dependencies.length === 0) {
        return 1;
      }
      if (a.dependencies.length === 0 && b.dependencies.length > 0) {
        return -1;
      }

      // 然后按优先级排序
      const priorityOrder = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
      };

      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;

      return bPriority - aPriority;
    });

    // 重新分配执行顺序
    tasks.forEach((task, index) => {
      task.executionOrder = index;
    });
  }

  /**
   * 应用约束和偏好
   */
  private applyConstraints(tasks: PlannedTask[], request: PlanningRequest): void {
    const { constraints, preferences, config } = request;

    // 应用最大任务数限制
    const maxTasks = constraints?.maxDuration ?
      Math.floor(constraints.maxDuration / 5000) : // 假设每个任务平均5秒
      config?.maxTasksPerPlan || 10;

    if (tasks.length > maxTasks) {
      // 保留高优先级任务
      tasks.sort((a, b) => {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      });
      tasks.splice(maxTasks);
    }

    // 应用排除的任务类型
    if (constraints?.excludedTasks) {
      for (const excludedType of constraints.excludedTasks) {
        const index = tasks.findIndex(task => task.taskType === excludedType);
        if (index !== -1) {
          tasks.splice(index, 1);
        }
      }
    }

    // 根据偏好设置并行执行
    if (preferences?.parallelExecution !== undefined) {
      tasks.forEach(task => {
        task.canRunInParallel = preferences.parallelExecution && task.canRunInParallel;
      });
    }
  }

  /**
   * 识别浏览器操作任务
   */
  private async identifyBrowserTasks(
    prompt: string
  ): Promise<BrowserTaskTemplate[]> {
    return this.browserAnalyzer.analyzeBrowserTasks(prompt, this.pageAnalysis || undefined);
  }

  /**
   * 创建浏览器计划任务
   */
  private async createBrowserPlannedTask(
    template: BrowserTaskTemplate,
    request: PlanningRequest,
    extractedInfo: Record<string, any>,
    executionOrder: number
  ): Promise<PlannedTask | null> {
    const { prompt, context } = request;

    // 创建浏览器任务参数
    const parameters = this.extractBrowserParameters(template, prompt, context);

    // 创建计划任务
    const plannedTask: PlannedTask = {
      id: AgentUtils.generateId(`browser_${template.id}`),
      name: template.name,
      description: template.description,
      taskType: `browser_${template.actionType}`, // 添加浏览器任务前缀
      parameters,
      priority: template.priority,
      status: 'pending' as any,
      dependencies: [],
      estimatedDuration: template.estimatedDuration,
      maxRetries: 2, // 浏览器操作重试次数较少
      retryCount: 0,
      createdAt: Date.now(),
      executionOrder,
      canRunInParallel: template.canRunInParallel,
      requiresUserInteraction: true, // 浏览器操作通常需要用户交互
      tags: this.generateBrowserTags(template, extractedInfo),
      metadata: {
        templateId: template.id,
        actionType: template.actionType,
        requiresPageAnalysis: template.requiresPageAnalysis,
        isBrowserTask: true
      }
    };

    // 创建浏览器操作
    plannedTask.browserActions = await this.createBrowserActionsFromTemplate(template, parameters);

    return plannedTask;
  }

  /**
   * 提取浏览器任务参数
   */
  private extractBrowserParameters(
    template: BrowserTaskTemplate,
    prompt: string,
    context?: any
  ): Record<string, any> {
    const parameters: Record<string, any> = {};

    for (const [paramName, mapping] of Object.entries(template.parameterMapping)) {
      let value: any;

      switch (mapping.source) {
        case 'prompt':
          value = this.extractFromPromptForBrowser(prompt, mapping.extraction);
          break;
        case 'context':
          value = this.extractFromContext(context, mapping.extraction);
          break;
        case 'page_analysis':
          value = this.extractFromPageAnalysis(mapping.extraction, this.pageAnalysis);
          break;
      }

      if (value !== null && value !== undefined) {
        parameters[paramName] = value;
      } else if (mapping.required) {
        // 为必需参数提供默认值
        parameters[paramName] = this.getDefaultBrowserValue(paramName);
      }
    }

    return parameters;
  }

  /**
   * 从 prompt 中提取浏览器操作的值
   */
  private extractFromPromptForBrowser(
    prompt: string,
    extraction: string
  ): any {
    switch (extraction) {
      case 'extract_element_selector':
        return this.browserAnalyzer.extractElementSelector(prompt, this.pageAnalysis || undefined);

      case 'extract_input_selector':
        return this.browserAnalyzer.extractElementSelector(prompt, this.pageAnalysis || undefined);

      case 'extract_select_selector':
        return this.browserAnalyzer.extractElementSelector(prompt, this.pageAnalysis || undefined);

      case 'extract_input_value':
        return this.browserAnalyzer.extractInputValue(prompt);

      case 'extract_scroll_direction':
        return this.browserAnalyzer.extractScrollDirection(prompt);

      case 'extract_scroll_coordinates':
        const coordMatch = prompt.match(/(\d+)\s*,\s*(\d+)/);
        return coordMatch ? { x: parseInt(coordMatch[1]), y: parseInt(coordMatch[2]) } : null;

      case 'extract_scroll_target':
        return this.browserAnalyzer.extractElementSelector(prompt, this.pageAnalysis || undefined);

      case 'extract_wait_duration':
        return this.browserAnalyzer.extractWaitDuration(prompt);

      case 'extract_navigation_url':
        return this.browserAnalyzer.extractNavigationUrl(prompt);

      case 'extract_extraction_options':
        return this.browserAnalyzer.extractExtractionOptions(prompt);

      case 'extract_select_value':
        const valueMatch = prompt.match(/选择[：:]?\s*([^\n，,。.]+)/i);
        return valueMatch ? valueMatch[1].trim() : '';

      default:
        return null;
    }
  }

  /**
   * 从页面分析中提取值
   */
  private extractFromPageAnalysis(extraction: string, pageAnalysis?: PageAnalysis | null): any {
    if (!pageAnalysis) return null;

    switch (extraction) {
      case 'first_button':
        return pageAnalysis.buttons.length > 0 ? pageAnalysis.buttons[0].selector : null;

      case 'first_input':
        return pageAnalysis.inputs.length > 0 ? pageAnalysis.inputs[0].selector : null;

      case 'first_link':
        return pageAnalysis.links.length > 0 ? pageAnalysis.links[0].selector : null;

      case 'submit_button':
        const submitBtn = pageAnalysis.buttons.find(btn => /submit|提交|确认/.test(btn.text));
        return submitBtn ? submitBtn.selector : null;

      case 'login_button':
        const loginBtn = pageAnalysis.buttons.find(btn => /login|登录|signin/.test(btn.text));
        return loginBtn ? loginBtn.selector : null;

      case 'search_input':
        const searchInput = pageAnalysis.inputs.find(input =>
          /search|搜索|query/.test(input.name) || /search|搜索/.test(input.placeholder || '')
        );
        return searchInput ? searchInput.selector : null;

      default:
        return null;
    }
  }

  /**
   * 获取浏览器操作的默认值
   */
  private getDefaultBrowserValue(paramName: string): any {
    const defaults: Record<string, any> = {
      timeout: 2000,
      duration: 1000,
      direction: 'down',
      value: '默认值',
      coordinates: { x: 0, y: 500 },
      url: 'https://example.com'
    };

    return defaults[paramName] || null;
  }

  /**
   * 从浏览器模板创建浏览器操作
   */
  private async createBrowserActionsFromTemplate(
    template: BrowserTaskTemplate,
    parameters: Record<string, any>
  ): Promise<any[]> {
    const actions: any[] = [];

    // 根据模板类型创建对应的浏览器操作
    const action: any = {
      type: template.actionType
    };

    // 添加参数到操作中
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      if (paramName === 'selector' || paramName === 'value' || paramName === 'timeout' ||
          paramName === 'coordinates' || paramName === 'options') {
        action[paramName] = paramValue;
      }
    }

    if (Object.keys(action).length > 1) { // 除了type之外还有其他参数
      actions.push(action);
    }

    return actions;
  }

  /**
   * 生成浏览器任务标签
   */
  private generateBrowserTags(
    template: BrowserTaskTemplate,
    extractedInfo: Record<string, any>
  ): string[] {
    const tags = [template.name, `browser_${template.actionType}`, '浏览器操作'];

    if (extractedInfo.hasClickRequest) tags.push('点击操作');
    if (extractedInfo.hasTypeRequest) tags.push('输入操作');
    if (extractedInfo.hasScrollRequest) tags.push('滚动操作');
    if (extractedInfo.hasNavigateRequest) tags.push('导航操作');
    if (extractedInfo.hasExtractRequest) tags.push('数据提取');
    if (extractedInfo.hasScreenshotRequest) tags.push('页面截图');

    return tags;
  }
}
