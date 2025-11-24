/**
 * Agent Library Usage Examples
 *
 * 这个文件包含了一些使用示例
 */

import { Agent } from './planner/core';
import { predefinedTasks } from './planner/tasks';
import { BrowserActionBatch } from './planner/browser';
import { AgentUtils } from './planner/utils';
import type { AgentLLMProvider, AgentContext, AgentTask } from './planner/types';

/**
 * 基础使用示例
 */
export function basicUsageExample() {
  console.log('=== Agent Library 基础使用示例 ===');

  // 1. 创建 Agent 实例
  const agent = new Agent({
    logLevel: 'info',
    timeout: 30000
  });

  // 2. 注册预定义任务
  predefinedTasks.forEach(task => {
    agent.registerTask(task);
  });

  // 3. 配置 LLM 提供商
  const provider: AgentLLMProvider = {
    id: 'openai-provider',
    name: 'OpenAI',
    type: 'openai',
    apiKey: 'your-api-key-here',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    enabled: true,
    isDefault: true
  };

  // 4. 创建执行上下文
  const context: AgentContext = {
    selectedText: '人工智能正在改变世界',
    currentUrl: 'https://example.com',
    pageTitle: '示例页面',
    timestamp: Date.now()
  };

  return { agent, provider, context };
}

/**
 * 文本处理示例
 */
export async function textProcessingExample() {
  console.log('=== 文本处理示例 ===');

  const { agent, provider, context } = basicUsageExample();

  try {
    // 文本摘要
    const summaryResult = await agent.executeTask('summarize_text', {
      text: '人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大，可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。',
      length: '简短'
    }, {
      provider,
      context
    });

    console.log('摘要结果:', summaryResult);

    // 文本翻译
    const translateResult = await agent.executeTask('translate_text', {
      text: 'Hello, how are you today?',
      targetLanguage: '中文'
    }, {
      provider,
      context
    });

    console.log('翻译结果:', translateResult);

    // 文本润色
    const improveResult = await agent.executeTask('improve_writing', {
      text: '这个想法很好，我们来做吧。',
      style: '正式'
    }, {
      provider,
      context
    });

    console.log('润色结果:', improveResult);

  } catch (error) {
    console.error('文本处理示例失败:', error);
  }
}

/**
 * 代码生成示例
 */
export async function codeGenerationExample() {
  console.log('=== 代码生成示例 ===');

  const { agent, provider } = basicUsageExample();

  try {
    // 生成代码
    const generateResult = await agent.executeTask('generate_code', {
      description: '创建一个函数，接收两个数字并返回它们的和',
      language: 'JavaScript'
    }, {
      provider
    });

    console.log('代码生成结果:', generateResult);

    // 解释代码
    const explainResult = await agent.executeTask('explain_code', {
      code: 'function add(a, b) { return a + b; }',
      language: 'JavaScript'
    }, {
      provider
    });

    console.log('代码解释结果:', explainResult);

    // 调试代码
    const debugResult = await agent.executeTask('debug_code', {
      code: 'function add(a, b) { return a - b; }',
      error: '函数返回了差值而不是和值',
      language: 'JavaScript'
    }, {
      provider
    });

    console.log('代码调试结果:', debugResult);

  } catch (error) {
    console.error('代码生成示例失败:', error);
  }
}

/**
 * 内容分析示例
 */
export async function contentAnalysisExample() {
  console.log('=== 内容分析示例 ===');

  const { agent, provider } = basicUsageExample();

  try {
    // 情感分析
    const sentimentResult = await agent.executeTask('sentiment_analysis', {
      text: '今天天气真好，心情也很愉快！',
      detailLevel: '详细'
    }, {
      provider
    });

    console.log('情感分析结果:', sentimentResult);

    // 内容分析
    const contentAnalysisResult = await agent.executeTask('content_analysis', {
      content: '这篇文章介绍了人工智能的发展历程、主要技术和未来趋势。文章结构清晰，内容翔实，既有理论分析也有实际案例。',
      aspects: ['结构', '逻辑', '表达', '实用性']
    }, {
      provider
    });

    console.log('内容分析结果:', contentAnalysisResult);

    // 关键词提取
    const keywordsResult = await agent.executeTask('extract_keywords', {
      text: '机器学习是人工智能的一个重要分支，它通过算法使计算机系统能够从数据中学习和改进。深度学习是机器学习的一个子领域，使用神经网络来模拟人脑的工作方式。',
      count: 8
    }, {
      provider
    });

    console.log('关键词提取结果:', keywordsResult);

  } catch (error) {
    console.error('内容分析示例失败:', error);
  }
}

/**
 * 浏览器自动化示例
 */
export async function browserAutomationExample() {
  console.log('=== 浏览器自动化示例 ===');

  const { agent, provider } = basicUsageExample();

  try {
    // 创建浏览器操作批次
    const browserBatch = new BrowserActionBatch();

    // 添加操作
    browserBatch
      .addAction({
        type: 'extract',
        options: {
          selectors: {
            title: 'title',
            description: 'meta[name="description"]',
            links: 'a[href]'
          },
          includeMeta: true,
          includeLinks: true
        }
      })
      .addAction({
        type: 'wait',
        timeout: 1000
      });

    // 执行浏览器操作
    const browserResults = await browserBatch.execute();
    console.log('浏览器操作结果:', browserResults);

    // 结合 AI 分析
    const analysisResult = await agent.executeTask('content_analysis', {
      content: JSON.stringify(browserResults, null, 2),
      aspects: ['结构', '可用性']
    }, {
      provider,
      browserActions: browserBatch['actions'] // 获取操作列表
    });

    console.log('结合 AI 的分析结果:', analysisResult);

  } catch (error) {
    console.error('浏览器自动化示例失败:', error);
  }
}

/**
 * 自定义任务示例
 */
export async function customTaskExample() {
  console.log('=== 自定义任务示例 ===');

  const { agent, provider } = basicUsageExample();

  // 注册自定义任务
  const customTask: AgentTask = {
    id: 'email_generator',
    name: '邮件生成器',
    description: '根据信息生成专业的邮件',
    promptTemplate: '请生成一封专业的{{tone}}邮件，收件人是{{recipient}}，主题是{{subject}}，内容要点如下：\n\n{{content}}',
    parameters: [
      {
        name: 'recipient',
        type: 'string',
        required: true,
        description: '收件人'
      },
      {
        name: 'subject',
        type: 'string',
        required: true,
        description: '邮件主题'
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '邮件内容要点'
      },
      {
        name: 'tone',
        type: 'string',
        required: false,
        description: '邮件语气',
        defaultValue: '正式',
        validation: {
          enum: ['正式', '友好', '紧急', '道歉']
        }
      }
    ],
    category: '内容生成',
    enabled: true
  };

  agent.registerTask(customTask);

  try {
    // 执行自定义任务
    const result = await agent.executeTask('email_generator', {
      recipient: '张经理',
      subject: '项目进度汇报',
      content: '项目已完成70%，预计下周完成全部开发工作',
      tone: '正式'
    }, {
      provider
    });

    console.log('自定义任务结果:', result);

  } catch (error) {
    console.error('自定义任务示例失败:', error);
  }
}

/**
 * 错误处理示例
 */
export async function errorHandlingExample() {
  console.log('=== 错误处理示例 ===');

  const { agent, provider } = basicUsageExample();

  try {
    // 测试参数验证错误
    const invalidParamsResult = await agent.executeTask('summarize_text', {
      // 缺少必需的 text 参数
    }, {
      provider
    });

    console.log('参数验证错误结果:', invalidParamsResult);

    // 测试不存在的任务
    const nonexistentTaskResult = await agent.executeTask('nonexistent_task', {}, {
      provider
    });

    console.log('不存在任务错误结果:', nonexistentTaskResult);

  } catch (error) {
    console.error('错误处理示例:', error);
  }
}

/**
 * 工具函数使用示例
 */
export function utilityFunctionsExample() {
  console.log('=== 工具函数使用示例 ===');

  // ID 生成
  console.log('生成的ID:', AgentUtils.generateId('task'));

  // 时间格式化
  console.log('格式化时间:', AgentUtils.formatTime(3500));

  // 文本处理
  const longText = '这是一段很长的文本...' + 'a'.repeat(1000);
  console.log('截断文本:', AgentUtils.truncateText(longText, 50));

  // Token 估算
  const sampleText = 'Hello world 你好世界';
  console.log('估算Token数:', AgentUtils.estimateTokens(sampleText));

  // 任务过滤
  const filteredTasks = AgentUtils.filterTasks(predefinedTasks, {
    category: '文本处理',
    enabled: true
  });
  console.log('过滤后的任务数量:', filteredTasks.length);
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('开始运行所有示例...\n');

  try {
    // 基础示例
    console.log('\n1. 工具函数示例:');
    utilityFunctionsExample();

    console.log('\n2. 文本处理示例:');
    // await textProcessingExample(); // 需要实际的 API 密钥

    console.log('\n3. 代码生成示例:');
    // await codeGenerationExample(); // 需要实际的 API 密钥

    console.log('\n4. 内容分析示例:');
    // await contentAnalysisExample(); // 需要实际的 API 密钥

    console.log('\n5. 自定义任务示例:');
    // await customTaskExample(); // 需要实际的 API 密钥

    console.log('\n6. 错误处理示例:');
    // await errorHandlingExample(); // 需要实际的 API 密钥

    console.log('\n注意：需要配置有效的 LLM 提供商 API 密钥才能运行实际的任务执行示例。');

  } catch (error) {
    console.error('示例运行失败:', error);
  }
}

// 导出示例函数供外部调用
export const examples = {
  basicUsageExample,
  textProcessingExample,
  codeGenerationExample,
  contentAnalysisExample,
  browserAutomationExample,
  customTaskExample,
  errorHandlingExample,
  utilityFunctionsExample,
  runAllExamples
};
