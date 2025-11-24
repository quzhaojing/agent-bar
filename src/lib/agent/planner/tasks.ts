/**
 * Predefined Agent Tasks
 *
 * 这个文件包含了一些预定义的常用任务
 */

import type { AgentTask } from './types';
import { AgentTaskType } from './types';

/**
 * 文本处理任务
 */
export const textProcessingTasks: AgentTask[] = [
  {
    id: 'summarize_text',
    name: '文本摘要',
    description: '对输入的文本进行智能摘要',
    promptTemplate: '请对以下文本进行简洁明了的摘要，突出重点内容：\n\n{{text}}',
    parameters: [
      {
        name: 'text',
        type: 'string',
        required: true,
        description: '需要摘要的文本内容'
      },
      {
        name: 'length',
        type: 'string',
        required: false,
        description: '摘要长度控制',
        defaultValue: '中等',
        validation: {
          enum: ['简短', '中等', '详细']
        }
      }
    ],
    category: '文本处理',
    enabled: true
  },
  {
    id: 'translate_text',
    name: '文本翻译',
    description: '将文本翻译到指定语言',
    promptTemplate: '请将以下文本翻译成{{targetLanguage}}：\n\n{{text}}',
    parameters: [
      {
        name: 'text',
        type: 'string',
        required: true,
        description: '需要翻译的文本'
      },
      {
        name: 'targetLanguage',
        type: 'string',
        required: true,
        description: '目标语言',
        defaultValue: '中文',
        validation: {
          enum: ['中文', '英文', '日文', '韩文', '法文', '德文', '西班牙文']
        }
      }
    ],
    category: '文本处理',
    enabled: true
  },
  {
    id: 'improve_writing',
    name: '文本润色',
    description: '改进文本的表达和语法',
    promptTemplate: '请对以下文本进行润色，改进语法、表达和可读性：\n\n{{text}}',
    parameters: [
      {
        name: 'text',
        type: 'string',
        required: true,
        description: '需要润色的文本'
      },
      {
        name: 'style',
        type: 'string',
        required: false,
        description: '写作风格',
        defaultValue: '正式',
        validation: {
          enum: ['正式', '休闲', '学术', '商务', '创意']
        }
      }
    ],
    category: '文本处理',
    enabled: true
  }
];

/**
 * 内容生成任务
 */
export const contentGenerationTasks: AgentTask[] = [
  {
    id: 'generate_title',
    name: '生成标题',
    description: '根据内容生成合适的标题',
    promptTemplate: '请为以下内容生成{{count}}个吸引人的标题：\n\n{{content}}',
    parameters: [
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '内容文本'
      },
      {
        name: 'count',
        type: 'number',
        required: false,
        description: '生成标题的数量',
        defaultValue: 5,
        validation: {
          min: 1,
          max: 10
        }
      },
      {
        name: 'style',
        type: 'string',
        required: false,
        description: '标题风格',
        defaultValue: '通用',
        validation: {
          enum: ['通用', '新闻', '博客', '社交媒体', '学术']
        }
      }
    ],
    category: '内容生成',
    enabled: true
  },
  {
    id: 'generate_outline',
    name: '生成大纲',
    description: '根据主题生成内容大纲',
    promptTemplate: '请为主题"{{topic}}"生成详细的内容大纲：',
    parameters: [
      {
        name: 'topic',
        type: 'string',
        required: true,
        description: '主题'
      },
      {
        name: 'depth',
        type: 'number',
        required: false,
        description: '大纲深度',
        defaultValue: 3,
        validation: {
          min: 1,
          max: 5
        }
      }
    ],
    category: '内容生成',
    enabled: true
  }
];

/**
 * 数据提取任务
 */
export const dataExtractionTasks: AgentTask[] = [
  {
    id: 'extract_keywords',
    name: '提取关键词',
    description: '从文本中提取关键词',
    promptTemplate: '请从以下文本中提取最重要的关键词：\n\n{{text}}',
    parameters: [
      {
        name: 'text',
        type: 'string',
        required: true,
        description: '文本内容'
      },
      {
        name: 'count',
        type: 'number',
        required: false,
        description: '关键词数量',
        defaultValue: 10,
        validation: {
          min: 1,
          max: 20
        }
      }
    ],
    category: '数据提取',
    enabled: true
  },
  {
    id: 'extract_entities',
    name: '实体识别',
    description: '识别文本中的命名实体',
    promptTemplate: '请从以下文本中识别人名、地名、组织名等命名实体：\n\n{{text}}',
    parameters: [
      {
        name: 'text',
        type: 'string',
        required: true,
        description: '文本内容'
      },
      {
        name: 'entityTypes',
        type: 'array',
        required: false,
        description: '要识别的实体类型',
        defaultValue: ['人名', '地名', '组织名', '时间', '日期']
      }
    ],
    category: '数据提取',
    enabled: true
  }
];

/**
 * 代码相关任务
 */
export const codeGenerationTasks: AgentTask[] = [
  {
    id: 'generate_code',
    name: '代码生成',
    description: '根据描述生成代码',
    promptTemplate: '请用{{language}}编写代码实现以下功能：\n\n{{description}}',
    parameters: [
      {
        name: 'description',
        type: 'string',
        required: true,
        description: '功能描述'
      },
      {
        name: 'language',
        type: 'string',
        required: true,
        description: '编程语言',
        defaultValue: 'JavaScript',
        validation: {
          enum: ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'TypeScript', 'PHP']
        }
      }
    ],
    category: '代码生成',
    enabled: true
  },
  {
    id: 'explain_code',
    name: '代码解释',
    description: '解释代码的功能和逻辑',
    promptTemplate: '请解释以下{{language}}代码的功能和工作原理：\n\n```{{language}}\n{{code}}\n```',
    parameters: [
      {
        name: 'code',
        type: 'string',
        required: true,
        description: '代码内容'
      },
      {
        name: 'language',
        type: 'string',
        required: false,
        description: '编程语言',
        defaultValue: 'JavaScript'
      }
    ],
    category: '代码生成',
    enabled: true
  },
  {
    id: 'debug_code',
    name: '代码调试',
    description: '分析和修复代码中的错误',
    promptTemplate: '请分析以下{{language}}代码中的错误并提供修复方案：\n\n```{{language}}\n{{code}}\n```\n\n错误信息：{{error}}',
    parameters: [
      {
        name: 'code',
        type: 'string',
        required: true,
        description: '代码内容'
      },
      {
        name: 'error',
        type: 'string',
        required: false,
        description: '错误信息'
      },
      {
        name: 'language',
        type: 'string',
        required: false,
        description: '编程语言',
        defaultValue: 'JavaScript'
      }
    ],
    category: '代码生成',
    enabled: true
  }
];

/**
 * 分析任务
 */
export const analysisTasks: AgentTask[] = [
  {
    id: 'sentiment_analysis',
    name: '情感分析',
    description: '分析文本的情感倾向',
    promptTemplate: '请分析以下文本的情感倾向（积极、消极、中性）并给出理由：\n\n{{text}}',
    parameters: [
      {
        name: 'text',
        type: 'string',
        required: true,
        description: '要分析的文本'
      },
      {
        name: 'detailLevel',
        type: 'string',
        required: false,
        description: '分析详细程度',
        defaultValue: '中等',
        validation: {
          enum: ['简单', '中等', '详细']
        }
      }
    ],
    category: '分析',
    enabled: true
  },
  {
    id: 'content_analysis',
    name: '内容分析',
    description: '全面分析内容的特点和质量',
    promptTemplate: '请从多个角度分析以下内容的特点、质量和改进建议：\n\n{{content}}',
    parameters: [
      {
        name: 'content',
        type: 'string',
        required: true,
        description: '要分析的内容'
      },
      {
        name: 'aspects',
        type: 'array',
        required: false,
        description: '分析维度',
        defaultValue: ['结构', '逻辑', '表达', '创新性', '实用性']
      }
    ],
    category: '分析',
    enabled: true
  }
];

/**
 * 所有预定义任务
 */
export const predefinedTasks: AgentTask[] = [
  ...textProcessingTasks,
  ...contentGenerationTasks,
  ...dataExtractionTasks,
  ...codeGenerationTasks,
  ...analysisTasks
];

/**
 * 按类别获取任务
 */
export function getTasksByCategory(category: string): AgentTask[] {
  return predefinedTasks.filter(task => task.category === category);
}

/**
 * 按类型获取任务
 */
export function getTasksByType(type: AgentTaskType): AgentTask[] {
  const categoryMap: Record<AgentTaskType, string> = {
    [AgentTaskType.TEXT_PROCESSING]: '文本处理',
    [AgentTaskType.CONTENT_GENERATION]: '内容生成',
    [AgentTaskType.DATA_EXTRACTION]: '数据提取',
    [AgentTaskType.CODE_GENERATION]: '代码生成',
    [AgentTaskType.ANALYSIS]: '分析',
    [AgentTaskType.TRANSLATION]: '文本处理',
    [AgentTaskType.SUMMARIZATION]: '文本处理',
    [AgentTaskType.BROWSER_AUTOMATION]: '浏览器自动化',
    [AgentTaskType.CUSTOM]: '自定义'
  };

  const category = categoryMap[type];
  return category ? getTasksByCategory(category) : [];
}

/**
 * 获取所有任务类别
 */
export function getAllCategories(): string[] {
  const categories = new Set(predefinedTasks.map(task => task.category).filter(Boolean) as string[]);
  return Array.from(categories);
}
