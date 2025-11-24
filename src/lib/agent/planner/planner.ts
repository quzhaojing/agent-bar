/**
 * Task Planner
 *
 * 任务规划器的主要实现，整合分析和执行功能
 */

import { Agent } from './core';
import { predefinedTasks } from './tasks';
import { PromptAnalyzer } from './analyzer';
import { TaskExecutor } from './executor';
import type {
  TaskPlan,
  PlanningRequest,
  PlanningResult,
  TaskPlannerConfig,
  ExecutionProgress,
  TaskExecutionEvent,
  PlannedTask,
  AgentLLMProvider,
  AgentContext,
  PlannerOptions
} from './types';
import { ExecutionStrategy } from './types';
import { AgentUtils } from './utils';

/**
 * 任务规划器
 */
export class TaskPlanner {
  private agent: Agent;
  private analyzer: PromptAnalyzer;
  private executor: TaskExecutor;
  private config: TaskPlannerConfig;
  private options: PlannerOptions;
  private plans: Map<string, TaskPlan> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(
    config: TaskPlannerConfig = {},
    options: PlannerOptions = {},
    agentConfig?: any
  ) {
    this.config = {
      maxTasksPerPlan: 10,
      enableParallelExecution: true,
      maxConcurrentTasks: 3,
      enableAutoRetry: true,
      maxRetryAttempts: 3,
      planningTimeout: 30000,
      enableTaskChaining: true,
      taskTimeout: 60000,
      ...config
    };

    this.options = {
      enableAutoPlanning: true,
      enableTaskTemplates: true,
      enableDynamicReplanning: false,
      enableProgressCallbacks: true,
      enableDetailedLogging: true,
      maxPlanningIterations: 3,
      confidenceThreshold: 0.7,
      ...options
    };

    if (this.options.enableDetailedLogging) {
      console.log('TaskPlanner initialized');
    }

    // 初始化 Agent
    this.agent = new Agent(agentConfig);

    // 注册预定义任务
    predefinedTasks.forEach(task => this.agent.registerTask(task));

    // 初始化分析器和执行器
    this.analyzer = new PromptAnalyzer();
    this.executor = new TaskExecutor(this.agent);

    // 转发执行器事件
    this.forwardExecutorEvents();
  }

  /**
   * 创建任务计划
   */
  async createPlan(
    prompt: string,
    context?: AgentContext,
    provider?: AgentLLMProvider
  ): Promise<PlanningResult> {
    const startTime = Date.now();

    try {
      // 创建规划请求
      const request: PlanningRequest = {
        prompt,
        context,
        availableTasks: this.agent.getAllTasks(),
        config: this.config
      };

      // 如果提供了 LLM 提供商，添加到选项中
      if (provider) {
        request.availableTasks = request.availableTasks.map(task => ({
          ...task,
          // 这里可以根据需要调整任务配置
        }));
      }

      // 分析 prompt 并生成任务
      const plannedTasks = await this.analyzer.analyzePrompt(request);

      // 创建任务计划
      const plan: TaskPlan = {
        id: AgentUtils.generateId('plan'),
        name: this.generatePlanName(prompt),
        description: this.generatePlanDescription(prompt),
        originalPrompt: prompt,
        goal: this.extractGoal(prompt),
        tasks: plannedTasks,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'ready',
        context,
        config: this.config,
        estimatedTotalDuration: this.calculateEstimatedDuration(plannedTasks)
      };

      // 存储计划
      this.plans.set(plan.id, plan);

      const planningTime = Date.now() - startTime;

      return {
        success: true,
        plan,
        reasoning: this.generatePlanningReasoning(plan),
        metadata: {
          planningTime,
          tasksIdentified: plannedTasks.length,
          tasksFiltered: 0,
          complexityScore: this.calculateComplexityScore(plan)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          planningTime: Date.now() - startTime,
          tasksIdentified: 0,
          tasksFiltered: 0,
          complexityScore: 0
        }
      };
    }
  }

  /**
   * 执行任务计划
   */
  async executePlan(
    planId: string,
    options: {
      strategy?: ExecutionStrategy;
      provider?: AgentLLMProvider;
      onProgress?: (progress: ExecutionProgress) => void;
      onEvent?: (event: TaskExecutionEvent) => void;
    } = {}
  ): Promise<TaskPlan> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    // 准备执行选项
    const executionOptions = options.provider ? { provider: options.provider } : undefined;

    // 执行计划
    return this.executor.executePlan(plan, {
      strategy: options.strategy,
      onProgress: options.onProgress,
      onEvent: options.onEvent,
      executionOptions
    });
  }

  /**
   * 一步式执行（创建计划并立即执行）
   */
  async executePrompt(
    prompt: string,
    options: {
      context?: AgentContext;
      provider?: AgentLLMProvider;
      strategy?: ExecutionStrategy;
      onProgress?: (progress: ExecutionProgress) => void;
      onEvent?: (event: TaskExecutionEvent) => void;
    } = {}
  ): Promise<TaskPlan> {
    // 创建计划
    const planningResult = await this.createPlan(prompt, options.context, options.provider);

    if (!planningResult.success || !planningResult.plan) {
      throw new Error(`Planning failed: ${planningResult.error}`);
    }

    // 执行计划
    return this.executePlan(planningResult.plan.id, {
      strategy: options.strategy,
      provider: options.provider,
      onProgress: options.onProgress,
      onEvent: options.onEvent
    });
  }

  /**
   * 获取计划
   */
  getPlan(planId: string): TaskPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * 获取所有计划
   */
  getAllPlans(): TaskPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * 删除计划
   */
  deletePlan(planId: string): boolean {
    return this.plans.delete(planId);
  }

  /**
   * 更新计划
   */
  updatePlan(planId: string, updates: Partial<TaskPlan>): TaskPlan | null {
    const plan = this.plans.get(planId);
    if (!plan) {
      return null;
    }

    const updatedPlan = { ...plan, ...updates, updatedAt: Date.now() };
    this.plans.set(planId, updatedPlan);
    return updatedPlan;
  }

  /**
   * 重新规划任务
   */
  async replanTask(
    planId: string,
    taskId: string,
    newPrompt?: string
  ): Promise<PlanningResult> {
    const originalPlan = this.plans.get(planId);
    if (!originalPlan) {
      return {
        success: false,
        error: `Plan not found: ${planId}`
      };
    }

    const taskToReplan = originalPlan.tasks.find(task => task.id === taskId);
    if (!taskToReplan) {
      return {
        success: false,
        error: `Task not found: ${taskId}`
      };
    }

    try {
      // 使用新的 prompt 或原始提示词重新规划
      const promptForReplan = newPrompt || originalPlan.originalPrompt;

      // 创建新的规划请求，排除当前任务
      const request: PlanningRequest = {
        prompt: promptForReplan,
        context: originalPlan.context,
        availableTasks: this.agent.getAllTasks(),
        config: this.config,
        constraints: {
          // 可以添加特定的约束
        }
      };

      // 分析并生成新任务
      const newTasks = await this.analyzer.analyzePrompt(request);

      // 替换失败的任务
      const taskIndex = originalPlan.tasks.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        // 保留原有的依赖关系，但更新任务内容
        const oldTask = originalPlan.tasks[taskIndex];
        const newTask = newTasks[0]; // 假设第一个任务是最相关的

        if (newTask) {
          originalPlan.tasks[taskIndex] = {
            ...newTask,
            id: oldTask.id, // 保持原有 ID
            dependencies: oldTask.dependencies, // 保持原有依赖
            executionOrder: oldTask.executionOrder, // 保持原有执行顺序
            retryCount: (oldTask.retryCount || 0) + 1
          };

          originalPlan.updatedAt = Date.now();

          return {
            success: true,
            plan: originalPlan,
            reasoning: `Replanned task "${taskToReplan.name}" with new task "${newTask.name}"`
          };
        }
      }

      return {
        success: false,
        error: 'Failed to generate replacement task'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 停止执行
   */
  async stopExecution(planId: string): Promise<void> {
    return this.executor.stopExecution(planId);
  }

  /**
   * 获取执行进度
   */
  getProgress(planId: string): ExecutionProgress | null {
    const context = this.executor.getExecutionContext(planId);
    if (!context) {
      return null;
    }

    const { plan, completedTasks, failedTasks } = context;
    const totalTasks = plan.tasks.length;
    const runningTasks = plan.tasks.filter(task => task.status === 'running').length;
    const pendingTasks = totalTasks - completedTasks.length - failedTasks.length - runningTasks;

    return {
      planId,
      totalTasks,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      runningTasks,
      pendingTasks,
      percentage: Math.round(((completedTasks.length + failedTasks.length) / totalTasks) * 100),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(context),
      currentTaskName: context.currentTask?.name,
      overallStatus: this.determineOverallStatus(plan)
    };
  }

  /**
   * 生成计划报告
   */
  generateReport(planId: string): string {
    const plan = this.plans.get(planId);
    if (!plan) {
      return `Plan not found: ${planId}`;
    }

    const report = [
      `# 任务计划报告`,
      `## 基本信息`,
      `- 计划ID: ${plan.id}`,
      `- 名称: ${plan.name}`,
      `- 状态: ${plan.status}`,
      `- 创建时间: ${new Date(plan.createdAt).toLocaleString()}`,
      `- 目标: ${plan.goal}`,
      ``,
      `## 任务列表 (${plan.tasks.length}个任务)`
    ];

    plan.tasks.forEach((task, index) => {
      report.push(`### ${index + 1}. ${task.name}`);
      report.push(`- ID: ${task.id}`);
      report.push(`- 类型: ${task.taskType}`);
      report.push(`- 状态: ${task.status}`);
      report.push(`- 优先级: ${task.priority}`);
      report.push(`- 描述: ${task.description}`);

      if (task.dependencies.length > 0) {
        report.push(`- 依赖: ${task.dependencies.map(dep => dep.taskId).join(', ')}`);
      }

      if (task.result) {
        report.push(`- 执行时间: ${AgentUtils.formatTime(task.result.executionTime || 0)}`);
        if (task.result.success) {
          report.push(`- 结果: 成功`);
        } else {
          report.push(`- 错误: ${task.result.error}`);
        }
      }

      report.push('');
    });

    if (plan.actualDuration) {
      report.push(`## 执行统计`);
      report.push(`- 总执行时间: ${AgentUtils.formatTime(plan.actualDuration)}`);
      report.push(`- 成功任务: ${plan.tasks.filter(t => t.status === 'completed').length}`);
      report.push(`- 失败任务: ${plan.tasks.filter(t => t.status === 'failed').length}`);
      report.push(`- 成功率: ${Math.round((plan.tasks.filter(t => t.status === 'completed').length / plan.tasks.length) * 100)}%`);
    }

    return report.join('\n');
  }

  /**
   * 添加事件监听器
   */
  addEventListener(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: string, listener: Function): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 私有方法

  /**
   * 转发执行器事件
   */
  private forwardExecutorEvents(): void {
    // 这里可以添加事件转发逻辑
  }

  /**
   * 生成计划名称
   */
  private generatePlanName(prompt: string): string {
    const name = prompt.substring(0, 30);
    return name.length === 30 ? name + '...' : name;
  }

  /**
   * 生成计划描述
   */
  private generatePlanDescription(prompt: string): string {
    return `基于用户需求"${prompt.substring(0, 50)}..."生成的任务计划`;
  }

  /**
   * 提取目标
   */
  private extractGoal(prompt: string): string {
    return `完成用户请求的任务: ${prompt}`;
  }

  /**
   * 计算预估持续时间
   */
  private calculateEstimatedDuration(tasks: PlannedTask[]): number {
    return tasks.reduce((total, task) => total + (task.estimatedDuration || 5000), 0);
  }

  /**
   * 计算复杂度分数
   */
  private calculateComplexityScore(plan: TaskPlan): number {
    let score = 0;

    // 基于任务数量
    score += plan.tasks.length * 10;

    // 基于依赖关系
    const dependencyCount = plan.tasks.reduce((total, task) => total + task.dependencies.length, 0);
    score += dependencyCount * 15;

    // 基于并行可能性
    const parallelizableTasks = plan.tasks.filter(task => task.canRunInParallel).length;
    score += (plan.tasks.length - parallelizableTasks) * 5;

    return Math.min(score, 100); // 最大分数为100
  }

  /**
   * 生成规划推理
   */
  private generatePlanningReasoning(plan: TaskPlan): string {
    const reasons = [
      `识别了 ${plan.tasks.length} 个相关任务`,
      `分析了任务间的依赖关系`,
      `优化了执行顺序`
    ];

    if (plan.tasks.some(task => task.canRunInParallel)) {
      reasons.push('识别了可并行执行的任务');
    }

    return `规划原因: ${reasons.join(', ')}`;
  }

  /**
   * 计算预估剩余时间
   */
  private calculateEstimatedTimeRemaining(context: any): number {
    const { plan, completedTasks, startTime } = context;
    const completedCount = completedTasks.length;
    const remainingCount = plan.tasks.length - completedCount;

    if (completedCount === 0) {
      return plan.estimatedTotalDuration || 0;
    }

    const elapsedTime = Date.now() - startTime;
    const averageTaskTime = elapsedTime / completedCount;

    return Math.round(remainingCount * averageTaskTime);
  }

  /**
   * 确定总体状态
   */
  private determineOverallStatus(plan: TaskPlan): any {
    const completedCount = plan.tasks.filter(task => task.status === 'completed').length;
    const failedCount = plan.tasks.filter(task => task.status === 'failed').length;

    if (completedCount === plan.tasks.length) {
      return 'completed';
    }

    if (failedCount === plan.tasks.length) {
      return 'failed';
    }

    if (completedCount > 0 || failedCount > 0) {
      return 'running';
    }

    return 'pending';
  }
}
