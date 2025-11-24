/**
 * Task Planner Types
 *
 * 任务规划器相关的类型定义
 */



// LLM 提供商配置（扩展现有的 LLMProvider）
export interface AgentLLMProvider {
  id: string;
  name: string;
  type: 'openai' | 'claude' | 'gemini' | 'deepseek' | 'qwen' | 'glm';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
  isDefault?: boolean;
}

// 基础参数类型
export interface AgentParameter {
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

// Agent 任务配置
export interface AgentTask {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  parameters: AgentParameter[];
  category?: string;
  enabled: boolean;
}

// Agent 执行结果
export interface AgentResult {
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

// Agent 上下文信息
export interface AgentContext {
  selectedText?: string;
  currentUrl?: string;
  pageTitle?: string;
  timestamp: number;
  userAgent?: string;
  [key: string]: any;
}

// 浏览器操作接口
export interface BrowserAction {
  type: 'click' | 'type' | 'scroll' | 'navigate' | 'wait' | 'extract' | 'screenshot';
  selector?: string;
  value?: string;
  coordinates?: { x: number; y: number };
  timeout?: number;
  options?: Record<string, any>;
}



// Agent 配置
export interface AgentConfig {
  defaultProvider?: AgentLLMProvider;
  fallbackProviders?: AgentLLMProvider[];
  timeout?: number;
  retryAttempts?: number;
  enableCache?: boolean;
  maxCacheSize?: number;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
}

// Agent 执行选项
export interface AgentExecutionOptions {
  provider?: AgentLLMProvider;
  context?: AgentContext;
  browserActions?: BrowserAction[];
  timeout?: number;
  stream?: boolean;
  onProgress?: (progress: number, message?: string) => void;
}

// 预定义的任务类型
export enum AgentTaskType {
  TEXT_PROCESSING = 'text_processing',
  CONTENT_GENERATION = 'content_generation',
  DATA_EXTRACTION = 'data_extraction',
  TRANSLATION = 'translation',
  SUMMARIZATION = 'summarization',
  ANALYSIS = 'analysis',
  BROWSER_AUTOMATION = 'browser_automation',
  CODE_GENERATION = 'code_generation',
  CUSTOM = 'custom'
}

// 错误类型
export enum AgentErrorType {
  INVALID_PARAMETERS = 'invalid_parameters',
  PROVIDER_ERROR = 'provider_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  BROWSER_ERROR = 'browser_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Agent 错误类
export class AgentError extends Error {
  public readonly type: AgentErrorType;
  public readonly details?: any;

  constructor(type: AgentErrorType, message: string, details?: any) {
    super(message);
    this.name = 'AgentError';
    this.type = type;
    this.details = details;
  }
}

/**
 * 任务规划器配置
 */
export interface TaskPlannerConfig {
  maxTasksPerPlan?: number;
  enableParallelExecution?: boolean;
  maxConcurrentTasks?: number;
  enableAutoRetry?: boolean;
  maxRetryAttempts?: number;
  planningTimeout?: number;
  enableTaskChaining?: boolean;
  taskTimeout?: number;
}

/**
 * 任务优先级
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  PLANNED = 'planned',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

/**
 * 任务依赖关系
 */
export interface TaskDependency {
  taskId: string;
  condition?: 'success' | 'completion' | 'failure';
  outputMapping?: Record<string, string>; // 输出参数映射
}

/**
 * 计划任务
 */
export interface PlannedTask {
  id: string;
  name: string;
  description: string;
  taskType: string; // 引用的 AgentTask.id
  parameters: Record<string, any>;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: TaskDependency[];
  estimatedDuration?: number;
  maxRetries?: number;
  retryCount?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: AgentResult;
  context?: AgentContext;
  browserActions?: BrowserAction[];
  executionOrder: number;
  canRunInParallel?: boolean;
  requiresUserInteraction?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * 任务计划
 */
export interface TaskPlan {
  id: string;
  name: string;
  description: string;
  originalPrompt: string;
  goal: string;
  tasks: PlannedTask[];
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'ready' | 'executing' | 'completed' | 'failed' | 'cancelled';
  context?: AgentContext;
  config: TaskPlannerConfig;
  estimatedTotalDuration?: number;
  actualDuration?: number;
  metadata?: Record<string, any>;
}

/**
 * 执行策略
 */
export enum ExecutionStrategy {
  SEQUENTIAL = 'sequential',           // 顺序执行
  PARALLEL = 'parallel',              // 并行执行
  DEPENDENCY_AWARE = 'dependency_aware', // 基于依赖的智能执行
  PRIORITY_BASED = 'priority_based',   // 基于优先级执行
  ADAPTIVE = 'adaptive'                // 自适应执行
}

/**
 * 任务执行事件
 */
export interface TaskExecutionEvent {
  type: 'task_started' | 'task_completed' | 'task_failed' | 'task_retry' | 'plan_started' | 'plan_completed' | 'plan_failed';
  planId: string;
  taskId?: string;
  timestamp: number;
  data?: any;
  error?: string;
}

/**
 * 规划请求
 */
export interface PlanningRequest {
  prompt: string;
  context?: AgentContext;
  availableTasks: AgentTask[];
  config?: TaskPlannerConfig;
  constraints?: {
    maxDuration?: number;
    requiredTasks?: string[];
    excludedTasks?: string[];
    maxCost?: number;
    requiresBrowser?: boolean;
  };
  preferences?: {
    executionStrategy?: ExecutionStrategy;
    priority?: TaskPriority;
    parallelExecution?: boolean;
  };
}

/**
 * 规划结果
 */
export interface PlanningResult {
  success: boolean;
  plan?: TaskPlan;
  error?: string;
  reasoning?: string;
  alternativePlans?: TaskPlan[];
  metadata?: {
    planningTime: number;
    tasksIdentified: number;
    tasksFiltered: number;
    complexityScore: number;
  };
}

/**
 * 任务模板
 */
export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  taskType: string;
  parameterMapping: {
    [parameterName: string]: {
      source: 'prompt' | 'context' | 'previous_task' | 'constant';
      extraction: string; // 提取规则或值
      required: boolean;
    };
  };
  conditions?: {
    requires?: string[]; // 需要的条件
    conflicts?: string[]; // 冲突的任务
  };
  priority: TaskPriority;
  estimatedDuration: number;
  canRunInParallel: boolean;
  metadata?: { matchScore: number };
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  plan: TaskPlan;
  currentTask?: PlannedTask;
  completedTasks: PlannedTask[];
  failedTasks: PlannedTask[];
  sharedData: Record<string, any>;
  startTime: number;
  elapsedTime: number;
  strategy: ExecutionStrategy;
}

/**
 * 进度信息
 */
export interface ExecutionProgress {
  planId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentTaskName?: string;
  overallStatus: TaskStatus;
}

/**
 * 规划器选项
 */
export interface PlannerOptions {
  enableAutoPlanning?: boolean;
  enableTaskTemplates?: boolean;
  enableDynamicReplanning?: boolean;
  enableProgressCallbacks?: boolean;
  enableDetailedLogging?: boolean;
  maxPlanningIterations?: number;
  confidenceThreshold?: number;
}

/**
 * 任务链
 */
export interface TaskChain {
  id: string;
  name: string;
  tasks: string[]; // task IDs
  description: string;
  useCase: string;
  prerequisites?: string[];
  expectedOutput?: string;
}
