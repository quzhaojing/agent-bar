/**
 * Agent Library Main Entry Point
 *
 * 这是 agent 库的主入口文件，导出所有公共接口
 */

// 核心类型和接口
export * from './planner/types';

// 核心功能类
export { Agent, ParameterValidator, PromptTemplateProcessor } from './planner/core';

// 浏览器自动化
export { BrowserActionExecutor, BrowserActionBatch } from './planner/browser';

// 预定义任务
export { predefinedTasks } from './planner/tasks';

// 工具函数
export { AgentUtils } from './planner/utils';

// 任务规划器
export * from './planner';

// 示例和文档
export { examples as agentExamples } from './examples';

// 版本信息
export const AGENT_LIBRARY_VERSION = '1.0.0';
