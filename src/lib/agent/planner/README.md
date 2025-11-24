# Task Planner - 自动任务规划和执行系统

智能任务规划器能够根据用户输入的自然语言提示，自动分析需求、规划任务并执行。支持多种执行策略、依赖关系处理和并行执行。

## ✨ 特性

- 🧠 **智能分析** - 自动分析用户需求并分解为可执行任务
- 🔄 **多种策略** - 支持顺序、并行、依赖感知等多种执行策略
- 📊 **进度跟踪** - 实时监控执行进度和状态
- 🔗 **依赖管理** - 智能处理任务间的依赖关系
- 🎯 **错误处理** - 完善的错误处理和重试机制
- ⚡ **并行优化** - 自动识别可并行执行的任务
- 📈 **性能监控** - 详细的执行统计和性能分析

## 🚀 快速开始

### 基础使用

```typescript
import { TaskPlanner } from './src/lib/agent/planner';

// 创建规划器
const planner = new TaskPlanner({
  maxTasksPerPlan: 8,
  enableParallelExecution: true,
  maxConcurrentTasks: 2
});

// 配置 LLM 提供商
const provider = {
  id: 'openai-provider',
  name: 'OpenAI',
  type: 'openai' as const,
  apiKey: 'your-api-key-here',
  model: 'gpt-3.5-turbo',
  enabled: true,
  isDefault: true
};

// 一步式执行（创建计划并立即执行）
const plan = await planner.executePrompt(
  '请对这段文字进行总结并翻译成英文',
  {
    provider,
    strategy: ExecutionStrategy.DEPENDENCY_AWARE,
    onProgress: (progress) => {
      console.log(`进度: ${progress.percentage}%`);
    }
  }
);

console.log('执行结果:', plan.status);
```

### 分步执行

```typescript
// 1. 创建计划
const planningResult = await planner.createPlan(
  '分析文章内容并生成报告',
  context,
  provider
);

if (planningResult.success) {
  const plan = planningResult.plan;

  // 2. 执行计划
  const executedPlan = await planner.executePlan(plan.id, {
    strategy: ExecutionStrategy.PARALLEL,
    provider,
    onProgress: (progress) => {
      console.log(`进度: ${progress.completedTasks}/${progress.totalTasks}`);
    }
  });

  // 3. 生成报告
  const report = planner.generateReport(executedPlan.id);
  console.log(report);
}
```

## 📋 执行策略

### 1. 顺序执行 (Sequential)
```typescript
// 任务按顺序执行，一个任务完成后才开始下一个
const plan = await planner.executePrompt('用户需求', {
  strategy: ExecutionStrategy.SEQUENTIAL
});
```

### 2. 并行执行 (Parallel)
```typescript
// 可并行的任务同时执行
const plan = await planner.executePrompt('用户需求', {
  strategy: ExecutionStrategy.PARALLEL
});
```

### 3. 依赖感知执行 (DependencyAware)
```typescript
// 基于任务依赖关系智能执行（推荐）
const plan = await planner.executePrompt('用户需求', {
  strategy: ExecutionStrategy.DEPENDENCY_AWARE
});
```

### 4. 优先级执行 (PriorityBased)
```typescript
// 按任务优先级执行
const plan = await planner.executePrompt('用户需求', {
  strategy: ExecutionStrategy.PRIORITY_BASED
});
```

## 🔧 配置选项

### 规划器配置

```typescript
const planner = new TaskPlanner({
  maxTasksPerPlan: 10,           // 单个计划最大任务数
  enableParallelExecution: true, // 启用并行执行
  maxConcurrentTasks: 3,         // 最大并发任务数
  enableAutoRetry: true,         // 启用自动重试
  maxRetryAttempts: 3,           // 最大重试次数
  planningTimeout: 30000,        // 规划超时时间(ms)
  enableTaskChaining: true,      // 启用任务链
  taskTimeout: 60000            // 任务超时时间(ms)
});
```

### 规划选项

```typescript
const planner = new TaskPlanner(config, {
  enableAutoPlanning: true,       // 启用自动规划
  enableTaskTemplates: true,      // 启用任务模板
  enableDynamicReplanning: false, // 启用动态重新规划
  enableProgressCallbacks: true,  // 启用进度回调
  enableDetailedLogging: true,    // 启用详细日志
  maxPlanningIterations: 3,       // 最大规划迭代次数
  confidenceThreshold: 0.7        // 置信度阈值
});
```

## 📊 进度监控

```typescript
const plan = await planner.executePrompt('用户需求', {
  onProgress: (progress) => {
    console.log(`总进度: ${progress.percentage}%`);
    console.log(`已完成: ${progress.completedTasks}`);
    console.log(`失败: ${progress.failedTasks}`);
    console.log(`运行中: ${progress.runningTasks}`);
    console.log(`当前任务: ${progress.currentTaskName}`);

    if (progress.estimatedTimeRemaining) {
      console.log(`预计剩余时间: ${formatTime(progress.estimatedTimeRemaining)}`);
    }
  },
  onEvent: (event) => {
    console.log(`事件: ${event.type}`);
    if (event.error) {
      console.log(`错误: ${event.error}`);
    }
  }
});
```

## 🔍 支持的任务类型

规划器内置支持多种任务类型：

### 文本处理
- **文本摘要** - 对文本内容进行智能摘要
- **文本翻译** - 将文本翻译到指定语言
- **文本润色** - 改进文本的表达和语法

### 内容生成
- **标题生成** - 根据内容生成合适的标题
- **内容大纲** - 根据主题生成内容大纲

### 数据提取
- **关键词提取** - 从文本中提取关键词
- **实体识别** - 识别文本中的命名实体

### 代码相关
- **代码生成** - 根据描述生成代码
- **代码解释** - 解释代码的功能和逻辑
- **代码调试** - 分析和修复代码错误

### 分析任务
- **情感分析** - 分析文本的情感倾向
- **内容分析** - 全面分析内容特点和质量

## 🎯 实际应用场景

### 场景1: 内容处理工作流
```typescript
// 文章分析工作流
const plan = await planner.executePrompt(`
  请对这篇技术文章进行全面处理：
  1. 提取主要观点和关键词
  2. 分析文章的情感倾向
  3. 生成3个吸引人的标题
  4. 翻译成英文
  5. 生成简短摘要
`, {
  provider,
  strategy: ExecutionStrategy.DEPENDENCY_AWARE
});
```

### 场景2: 代码开发任务
```typescript
// 代码开发任务
const plan = await planner.executePrompt(`
  开发一个用户管理系统，需要：
  - 用户注册和登录功能
  - 数据验证和安全性
  - 用户信息管理界面
  - 权限控制系统
  请使用JavaScript实现并提供详细说明。
`, {
  provider,
  strategy: ExecutionStrategy.PRIORITY_BASED
});
```

### 场景3: 多语言内容处理
```typescript
// 多语言内容处理
const plan = await planner.executePrompt(`
  请将这段产品介绍处理成多种版本：
  原文："我们的AI助手可以帮助您提高工作效率。"

  需要：
  1. 提取核心卖点
  2. 生成营销标题
  3. 翻译成英文和日文
  4. 生成简短版本用于社交媒体
`, {
  provider,
  strategy: ExecutionStrategy.PARALLEL
});
```

## 📈 性能优化

### 并行优化
规划器会自动识别可以并行执行的任务：
- 独立的数据提取任务
- 不同语言的翻译任务
- 无依赖关系的分析任务

### 缓存机制
```typescript
const planner = new TaskPlanner({
  enableCache: true,
  maxCacheSize: 100
});
```

### 超时控制
```typescript
const planner = new TaskPlanner({
  planningTimeout: 30000,    // 规划超时
  taskTimeout: 60000,       // 任务超时
  executionTimeout: 300000  // 总执行超时
});
```

## 🔧 高级功能

### 动态重新规划
```typescript
// 任务失败时重新规划
const replanningResult = await planner.replanTask(
  planId,
  failedTaskId,
  '请使用不同的方法重新分析这个问题'
);
```

### 自定义任务模板
```typescript
// 添加自定义任务模板（需要访问内部分析器）
const analyzer = planner.getAnalyzer();
analyzer.addTaskTemplate({
  id: 'custom_analysis',
  name: '自定义分析',
  description: '执行自定义分析任务',
  keywords: ['自定义', '特殊', '定制'],
  taskType: 'content_analysis',
  parameterMapping: {
    content: { source: 'prompt', extraction: 'extract_content', required: true }
  },
  priority: TaskPriority.MEDIUM,
  estimatedDuration: 5000,
  canRunInParallel: true
});
```

### 事件监听
```typescript
// 监听执行事件
planner.addEventListener('task_completed', (event) => {
  console.log(`任务完成: ${event.taskId}`);
});

planner.addEventListener('task_failed', (event) => {
  console.log(`任务失败: ${event.taskId}, 错误: ${event.error}`);
});
```

## 📊 执行报告

生成详细的执行报告：
```typescript
const report = planner.generateReport(planId);
console.log(report);

// 报告包含：
// - 计划基本信息
// - 任务执行详情
// - 性能统计数据
// - 成功/失败分析
// - 执行时间分析
```

## 🚨 错误处理

```typescript
try {
  const plan = await planner.executePrompt('用户需求', options);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('执行超时，尝试减少任务数量或增加超时时间');
  } else if (error.message.includes('provider')) {
    console.log('LLM提供商错误，检查API密钥配置');
  } else {
    console.log('未知错误:', error.message);
  }
}
```

## 🛠️ 最佳实践

### 1. 合理设置任务数量
```typescript
const planner = new TaskPlanner({
  maxTasksPerPlan: 5 // 避免过多的任务导致执行时间过长
});
```

### 2. 选择合适的执行策略
- **简单任务** → `ExecutionStrategy.SEQUENTIAL`
- **独立任务** → `ExecutionStrategy.PARALLEL`
- **复杂依赖** → `ExecutionStrategy.DEPENDENCY_AWARE`
- **优先任务** → `ExecutionStrategy.PRIORITY_BASED`

### 3. 启用进度监控
```typescript
const plan = await planner.executePrompt('需求', {
  onProgress: (progress) => {
    // 提供用户反馈
    updateUI(progress);
  },
  onEvent: (event) => {
    // 记录重要事件
    logEvent(event);
  }
});
```

### 4. 合理配置超时
```typescript
const planner = new TaskPlanner({
  planningTimeout: 15000,   // 15秒规划超时
  taskTimeout: 30000,       // 30秒任务超时
  maxRetryAttempts: 2       // 最多重试2次
});
```

## 🔍 故障排除

### 常见问题

1. **规划失败**
   - 检查提示词是否清晰
   - 确认相关任务类型已注册
   - 验证 LLM 提供商配置

2. **执行超时**
   - 增加超时时间配置
   - 减少单次执行的任务数量
   - 检查网络连接

3. **任务失败**
   - 查看具体错误信息
   - 检查参数是否正确
   - 验证 LLM 提供商可用性

4. **并行执行问题**
   - 确认任务确实可以并行执行
   - 检查依赖关系配置
   - 调整并发任务数量

## 📚 示例代码

查看 `examples.ts` 文件获取更多详细示例：

```typescript
import { plannerExamples } from './src/lib/agent/planner/examples';

// 运行所有示例
await plannerExamples.runAllPlannerExamples();

// 或运行特定示例
await plannerExamples.complexContentAnalysisExample();
await plannerExamples.codeDevelopmentExample();
await plannerExamples.parallelExecutionExample();
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进任务规划器！

## 📄 许可证

MIT License