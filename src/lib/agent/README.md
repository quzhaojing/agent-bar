# Agent Library

一个功能强大的 TypeScript Agent 库，支持参数化任务执行、LLM 集成和浏览器自动化。

## 特性

- 🚀 **简单易用** - 直观的 API 设计，快速上手
- 🔧 **参数化任务** - 支持带参数的自定义任务和预定义任务
- 🤖 **LLM 集成** - 内置支持 OpenAI、Claude、Gemini 等主流 LLM
- 🌐 **浏览器自动化** - 支持页面操作、内容提取等浏览器功能
- 📦 **TypeScript** - 完整的类型支持
- 🔍 **智能验证** - 参数验证和错误处理
- ⚡ **高性能** - 支持缓存、重试等优化机制

## 安装

```typescript
// 直接导入使用
import { Agent, predefinedTasks } from './src/lib/agent';
```

## 快速开始

### 基础使用

```typescript
import { Agent, predefinedTasks } from './src/lib/agent';
import type { AgentLLMProvider } from './src/lib/agent';

// 1. 创建 Agent 实例
const agent = new Agent({
  logLevel: 'info',
  timeout: 30000
});

// 2. 注册预定义任务
predefinedTasks.forEach(task => agent.registerTask(task));

// 3. 配置 LLM 提供商
const provider: AgentLLMProvider = {
  id: 'openai-provider',
  name: 'OpenAI',
  type: 'openai',
  apiKey: 'your-api-key-here',
  model: 'gpt-3.5-turbo',
  enabled: true,
  isDefault: true
};

// 4. 执行任务
const result = await agent.executeTask('summarize_text', {
  text: '要摘要的文本内容...',
  length: '简短'
}, {
  provider
});

console.log(result.data); // 摘要结果
```

### 自定义任务

```typescript
// 注册自定义任务
agent.registerTask({
  id: 'my_custom_task',
  name: '我的自定义任务',
  description: '根据参数生成内容',
  promptTemplate: '请根据以下信息生成{{type}}内容：{{content}}',
  parameters: [
    {
      name: 'content',
      type: 'string',
      required: true,
      description: '输入内容'
    },
    {
      name: 'type',
      type: 'string',
      required: true,
      description: '内容类型',
      validation: {
        enum: ['摘要', '分析', '建议']
      }
    }
  ],
  category: '自定义',
  enabled: true
});

// 执行自定义任务
const result = await agent.executeTask('my_custom_task', {
  content: '人工智能技术发展迅速...',
  type: '摘要'
}, { provider });
```

### 浏览器自动化

```typescript
import { BrowserActionBatch } from './src/lib/agent';

// 创建浏览器操作批次
const browserBatch = new BrowserActionBatch();

// 添加操作
browserBatch
  .addAction({
    type: 'extract',
    options: {
      selectors: {
        title: 'title',
        description: 'meta[name="description"]'
      },
      includeMeta: true
    }
  })
  .addAction({
    type: 'click',
    selector: '.submit-button'
  });

// 结合 AI 分析
const result = await agent.executeTask('analyze_page', {
  pageData: 'extracted page data'
}, {
  provider,
  browserActions: browserBatch['actions']
});
```

## 核心 API

### Agent 类

主要的 Agent 类，提供任务管理、执行等功能。

```typescript
class Agent {
  constructor(config?: AgentConfig);

  registerTask(task: AgentTask): void;
  getTask(taskId: string): AgentTask | undefined;
  getAllTasks(): AgentTask[];
  removeTask(taskId: string): boolean;

  executeTask(
    taskId: string,
    parameters: Record<string, any>,
    options?: AgentExecutionOptions
  ): Promise<AgentResult>;
}
```

### 参数类型

```typescript
interface AgentParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}
```

### 任务配置

```typescript
interface AgentTask {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  parameters: AgentParameter[];
  category?: string;
  enabled: boolean;
}
```

### 执行结果

```typescript
interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    provider?: string;
    [key: string]: any;
  };
}
```

## 预定义任务

库内置了多种常用任务：

### 文本处理
- `summarize_text` - 文本摘要
- `translate_text` - 文本翻译
- `improve_writing` - 文本润色

### 内容生成
- `generate_title` - 生成标题
- `generate_outline` - 生成大纲

### 数据提取
- `extract_keywords` - 提取关键词
- `extract_entities` - 实体识别

### 代码相关
- `generate_code` - 代码生成
- `explain_code` - 代码解释
- `debug_code` - 代码调试

### 分析任务
- `sentiment_analysis` - 情感分析
- `content_analysis` - 内容分析

## 浏览器操作

支持多种浏览器自动化操作：

```typescript
// 点击元素
{ type: 'click', selector: '.button' }

// 输入文本
{ type: 'type', selector: '#input', value: 'text' }

// 滚动页面
{ type: 'scroll', coordinates: { x: 0, y: 500 } }

// 导航到新页面
{ type: 'navigate', value: 'https://example.com' }

// 等待
{ type: 'wait', timeout: 2000 }

// 提取内容
{ type: 'extract', options: { includeMeta: true } }

// 截图
{ type: 'screenshot' }
```

## 工具函数

```typescript
import { AgentUtils } from './src/lib/agent';

// 生成唯一ID
AgentUtils.generateId('prefix'); // 'prefix_1234567890_abc123'

// 格式化时间
AgentUtils.formatTime(3500); // '3.50s'

// 截断文本
AgentUtils.truncateText(text, 100); // 截断到100字符

// 估算 Token 数量
AgentUtils.estimateTokens('Hello world'); // 3

// 任务过滤
AgentUtils.filterTasks(tasks, {
  category: '文本处理',
  enabled: true
});
```

## 错误处理

库提供了完整的错误处理机制：

```typescript
const result = await agent.executeTask('task_id', parameters);

if (result.success) {
  console.log('任务成功:', result.data);
} else {
  console.error('任务失败:', result.error);
  console.log('执行时间:', result.executionTime);
}
```

## 配置选项

```typescript
interface AgentConfig {
  defaultProvider?: AgentLLMProvider;
  fallbackProviders?: AgentLLMProvider[];
  timeout?: number;
  retryAttempts?: number;
  enableCache?: boolean;
  maxCacheSize?: number;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}
```

## 示例

查看 `examples.ts` 文件获取更多详细示例：

```typescript
import { examples } from './src/lib/agent/examples';

// 运行所有示例
await examples.runAllExamples();

// 或运行特定示例
await examples.textProcessingExample();
```

## LLM 提供商配置

### OpenAI
```typescript
{
  id: 'openai',
  name: 'OpenAI',
  type: 'openai',
  apiKey: 'sk-...',
  model: 'gpt-3.5-turbo',
  baseUrl: 'https://api.openai.com/v1'
}
```

### Claude
```typescript
{
  id: 'claude',
  name: 'Claude',
  type: 'claude',
  apiKey: 'sk-ant-...',
  model: 'claude-3-sonnet-20240229',
  baseUrl: 'https://api.anthropic.com/v1'
}
```

### Gemini
```typescript
{
  id: 'gemini',
  name: 'Gemini',
  type: 'gemini',
  apiKey: '...',
  model: 'gemini-pro',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
}
```

## 注意事项

1. 需要有效的 LLM 提供商 API 密钥
2. 浏览器操作需要在浏览器环境中执行
3. 某些高级功能（如截图）可能需要额外权限
4. 建议在生产环境中配置适当的错误处理和重试机制

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License