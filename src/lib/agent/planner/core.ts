/**
 * Agent Library Core Implementation
 *
 * 这个文件实现了 agent 库的核心功能
 */

import type {
  AgentTask,
  AgentParameter,
  AgentResult,
  AgentContext,
  AgentConfig,
  AgentExecutionOptions
} from './types';
import { AgentErrorType, AgentError } from './types';
import { llmClient } from '../../../utils/llmClient';
import type { APIRequest } from '../../../types';

/**
 * 参数验证器
 */
export class ParameterValidator {
  /**
   * 验证参数值是否符合参数定义
   */
  static validateParameter(param: AgentParameter, value: any): { valid: boolean; error?: string } {
    // 检查必需参数
    if (param.required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: `参数 '${param.name}' 是必需的` };
    }

    // 如果参数不是必需的且值为空，跳过验证
    if (!param.required && (value === undefined || value === null || value === '')) {
      return { valid: true };
    }

    // 类型验证
    const typeValidation = this.validateType(param.type, value);
    if (!typeValidation.valid) {
      return typeValidation;
    }

    // 额外验证规则
    if (param.validation) {
      const validation = this.validateValidation(param.validation, value);
      if (!validation.valid) {
        return validation;
      }
    }

    return { valid: true };
  }

  /**
   * 验证参数类型
   */
  private static validateType(expectedType: string, value: any): { valid: boolean; error?: string } {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: `期望字符串类型，实际类型: ${typeof value}` };
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: `期望数字类型，实际类型: ${typeof value}` };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: `期望布尔类型，实际类型: ${typeof value}` };
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          return { valid: false, error: `期望对象类型，实际类型: ${typeof value}` };
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, error: `期望数组类型，实际类型: ${typeof value}` };
        }
        break;
    }
    return { valid: true };
  }

  /**
   * 验证自定义验证规则
   */
  private static validateValidation(validation: NonNullable<AgentParameter['validation']>, value: any): { valid: boolean; error?: string } {
    if (validation.min !== undefined && typeof value === 'number' && value < validation.min) {
      return { valid: false, error: `值不能小于 ${validation.min}` };
    }

    if (validation.max !== undefined && typeof value === 'number' && value > validation.max) {
      return { valid: false, error: `值不能大于 ${validation.max}` };
    }

    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return { valid: false, error: `值不匹配模式: ${validation.pattern}` };
      }
    }

    if (validation.enum && !validation.enum.includes(value)) {
      return { valid: false, error: `值必须是以下选项之一: ${validation.enum.join(', ')}` };
    }

    return { valid: true };
  }

  /**
   * 验证参数集合
   */
  static validateParameters(parameters: AgentParameter[], values: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查未定义的参数
    for (const paramName in values) {
      if (!parameters.find(p => p.name === paramName)) {
        errors.push(`未知参数: ${paramName}`);
      }
    }

    // 验证定义的参数
    for (const param of parameters) {
      const validation = this.validateParameter(param, values[param.name]);
      if (!validation.valid) {
        errors.push(validation.error || `参数 '${param.name}' 验证失败`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * 提示词模板处理器
 */
export class PromptTemplateProcessor {
  /**
   * 处理提示词模板，替换参数占位符
   */
  static processTemplate(template: string, parameters: Record<string, any>, context?: AgentContext): string {
    let processed = template;

    // 替换参数占位符 {{parameterName}}
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value || ''));
    }

    // 替换上下文占位符
    if (context) {
      processed = processed.replace(/{{selectedText}}/g, context.selectedText || '');
      processed = processed.replace(/{{currentUrl}}/g, context.currentUrl || '');
      processed = processed.replace(/{{pageTitle}}/g, context.pageTitle || '');
      processed = processed.replace(/{{timestamp}}/g, String(context.timestamp));
      processed = processed.replace(/{{userAgent}}/g, context.userAgent || '');
    }

    return processed;
  }
}

/**
 * Agent 核心类
 */
export class Agent {
  private config: AgentConfig;
  private tasks: Map<string, AgentTask> = new Map();

  constructor(config: AgentConfig = {}) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      enableCache: true,
      maxCacheSize: 100,
      logLevel: 'info',
      ...config
    };
  }

  /**
   * 注册一个任务
   */
  registerTask(task: AgentTask): void {
    this.tasks.set(task.id, task);
    this.log(`info`, `已注册任务: ${task.name} (${task.id})`);
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 删除任务
   */
  removeTask(taskId: string): boolean {
    const removed = this.tasks.delete(taskId);
    if (removed) {
      this.log(`info`, `已删除任务: ${taskId}`);
    }
    return removed;
  }

  /**
   * 执行任务
   */
  async executeTask(
    taskId: string,
    parameters: Record<string, any>,
    options: AgentExecutionOptions = {}
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // 获取任务
      const task = this.tasks.get(taskId);
      if (!task) {
        throw new AgentError(
          AgentErrorType.UNKNOWN_ERROR,
          `任务不存在: ${taskId}`
        );
      }

      if (!task.enabled) {
        throw new AgentError(
          AgentErrorType.UNKNOWN_ERROR,
          `任务已禁用: ${taskId}`
        );
      }

      // 验证参数
      const validation = ParameterValidator.validateParameters(task.parameters, parameters);
      if (!validation.valid) {
        throw new AgentError(
          AgentErrorType.INVALID_PARAMETERS,
          `参数验证失败: ${validation.errors.join(', ')}`
        );
      }

      // 设置默认值
      const processedParameters = { ...parameters };
      for (const param of task.parameters) {
        if (processedParameters[param.name] === undefined && param.defaultValue !== undefined) {
          processedParameters[param.name] = param.defaultValue;
        }
      }

      // 处理提示词模板
      const prompt = PromptTemplateProcessor.processTemplate(
        task.promptTemplate,
        processedParameters,
        options.context
      );

      // 执行 LLM 请求
      const provider = options.provider || this.config.defaultProvider;
      if (!provider) {
        throw new AgentError(
          AgentErrorType.PROVIDER_ERROR,
          '未配置 LLM 提供商'
        );
      }

      const apiRequest: APIRequest = {
        provider,
        prompt,
        selectedText: options.context?.selectedText || ''
      };

      // 执行浏览器操作（如果有）
      if (options.browserActions && options.browserActions.length > 0) {
        const browserResults = await this.executeBrowserActions(options.browserActions);
        // 将浏览器操作结果添加到上下文中
        if (browserResults.length > 0) {
          apiRequest.prompt = prompt + '\n\n浏览器操作结果:\n' + JSON.stringify(browserResults, null, 2);
        }
      }

      // 调用 LLM
      const response = await llmClient.makeRequest(apiRequest);

      if (!response.success) {
        throw new AgentError(
          AgentErrorType.PROVIDER_ERROR,
          response.error || 'LLM 请求失败'
        );
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        executionTime,
        metadata: {
          tokensUsed: response.usage?.totalTokens,
          model: provider.model,
          provider: provider.name,
          taskName: task.name,
          taskId: task.id
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof AgentError) {
        return {
          success: false,
          error: error.message,
          executionTime,
          metadata: {
            errorType: error.type,
            errorDetails: error.details
          }
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        executionTime
      };
    }
  }

  /**
   * 执行浏览器操作
   */
  private async executeBrowserActions(actions: any[]): Promise<any[]> {
    const results: any[] = [];

    for (const action of actions) {
      try {
        let result: any;

        switch (action.type) {
          case 'extract':
            // 提取页面内容
            result = await this.extractPageContent(action.options);
            break;
          case 'screenshot':
            // 截图（需要在浏览器环境中）
            result = { message: '截图功能需要在浏览器环境中实现' };
            break;
          default:
            result = { message: `不支持的浏览器操作: ${action.type}` };
        }

        results.push({
          action: action.type,
          success: true,
          result
        });

      } catch (error) {
        results.push({
          action: action.type,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return results;
  }

  /**
   * 提取页面内容
   */
  private async extractPageContent(options?: any): Promise<any> {
    if (typeof window === 'undefined') {
      return { error: '需要在浏览器环境中执行' };
    }

    const content = {
      title: document.title,
      url: window.location.href,
      text: document.body.innerText,
      html: options?.includeHtml ? document.documentElement.outerHTML : undefined,
      meta: {
        description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
        keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content')
      }
    };

    return content;
  }

  /**
   * 记录日志
   */
  private log(level: string, message: string, data?: any): void {
    if (this.config.logLevel === 'none') return;

    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel || 'info');
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      console.log(`[Agent] ${level.toUpperCase()}: ${message}`, data || '');
    }
  }
}
