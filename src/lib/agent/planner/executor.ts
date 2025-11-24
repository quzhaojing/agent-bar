/**
 * Task Executor
 *
 * 这个文件负责执行任务计划，支持多种执行策略
 */

import { Agent } from './core';
import type {
  TaskPlan,
  PlannedTask,
  ExecutionContext,
  ExecutionProgress,
  TaskExecutionEvent,
  AgentExecutionOptions,
  AgentResult,
  AgentContext
} from './types';
import { ExecutionStrategy, TaskStatus } from './types';
import { AgentUtils } from './utils';
import { BrowserTaskExecutor } from './browser-executor';

/**
 * 任务执行器
 */
export class TaskExecutor {
  private agent: Agent;
  private browserExecutor: BrowserTaskExecutor;
  private eventListeners: Map<string, Function[]> = new Map();
  private executionContexts: Map<string, ExecutionContext> = new Map();

  constructor(agent: Agent) {
    this.agent = agent;
    this.browserExecutor = new BrowserTaskExecutor();
  }

  /**
   * 执行任务计划
   */
  async executePlan(
    plan: TaskPlan,
    options: {
      strategy?: ExecutionStrategy;
      onProgress?: (progress: ExecutionProgress) => void;
      onEvent?: (event: TaskExecutionEvent) => void;
      executionOptions?: AgentExecutionOptions;
    } = {}
  ): Promise<TaskPlan> {
    const { strategy = ExecutionStrategy.DEPENDENCY_AWARE, onProgress, onEvent, executionOptions } = options;

    // 创建执行上下文
    const context: ExecutionContext = {
      plan,
      completedTasks: [],
      failedTasks: [],
      sharedData: {},
      startTime: Date.now(),
      elapsedTime: 0,
      strategy
    };

    this.executionContexts.set(plan.id, context);

    try {
      // 更新计划状态
      plan.status = 'executing';
      plan.updatedAt = Date.now();

      // 发送计划开始事件
      this.emitEvent({
        type: 'plan_started',
        planId: plan.id,
        timestamp: Date.now(),
        data: { strategy, totalTasks: plan.tasks.length }
      });

      // 根据执行策略执行任务
      switch (strategy) {
        case ExecutionStrategy.SEQUENTIAL:
          await this.executeSequential(context, onProgress, onEvent, executionOptions);
          break;
        case ExecutionStrategy.PARALLEL:
          await this.executeParallel(context, onProgress, onEvent, executionOptions);
          break;
        case ExecutionStrategy.PRIORITY_BASED:
          await this.executePriorityBased(context, onProgress, onEvent, executionOptions);
          break;
        case ExecutionStrategy.DEPENDENCY_AWARE:
        default:
          await this.executeDependencyAware(context, onProgress, onEvent, executionOptions);
          break;
      }

      // 更新计划最终状态
      this.updatePlanFinalStatus(plan, context);

      // 发送计划完成事件
      this.emitEvent({
        type: 'plan_completed',
        planId: plan.id,
        timestamp: Date.now(),
        data: {
          totalTasks: plan.tasks.length,
          completedTasks: context.completedTasks.length,
          failedTasks: context.failedTasks.length,
          duration: Date.now() - context.startTime
        }
      });

    } catch (error) {
      // 处理执行错误
      plan.status = 'failed';
      plan.updatedAt = Date.now();

      this.emitEvent({
        type: 'plan_failed',
        planId: plan.id,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    } finally {
      // 清理执行上下文
      this.executionContexts.delete(plan.id);
    }

    return plan;
  }

  /**
   * 顺序执行任务
   */
  private async executeSequential(
    context: ExecutionContext,
    onProgress?: (progress: ExecutionProgress) => void,
    onEvent?: (event: TaskExecutionEvent) => void,
    executionOptions?: AgentExecutionOptions
  ): Promise<void> {
    const { plan } = context;

    // 按执行顺序排序
    const sortedTasks = [...plan.tasks].sort((a, b) => a.executionOrder - b.executionOrder);

    for (const task of sortedTasks) {
      if (task.status === TaskStatus.CANCELLED) continue;

      context.currentTask = task;
      await this.executeSingleTask(task, context, onEvent, executionOptions);

      // 更新进度
      if (onProgress) {
        onProgress(this.createProgress(context));
      }

      // 如果任务失败且不允许继续，则停止执行
      if (task.status === TaskStatus.FAILED) {
        const shouldContinue = await this.shouldContinueAfterFailure(task, context);
        if (!shouldContinue) {
          break;
        }
      }
    }
  }

  /**
   * 并行执行任务
   */
  private async executeParallel(
    context: ExecutionContext,
    onProgress?: (progress: ExecutionProgress) => void,
    onEvent?: (event: TaskExecutionEvent) => void,
    executionOptions?: AgentExecutionOptions
  ): Promise<void> {
    const { plan } = context;
    const maxConcurrency = plan.config.maxConcurrentTasks || 3;

    // 过滤可以并行执行的任务
    const parallelizableTasks = plan.tasks.filter(task => task.canRunInParallel);

    if (parallelizableTasks.length === 0) {
      // 如果没有可并行执行的任务，回退到顺序执行
      return this.executeSequential(context, onProgress, onEvent, executionOptions);
    }

    // 分批并行执行
    for (let i = 0; i < parallelizableTasks.length; i += maxConcurrency) {
      const batch = parallelizableTasks.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(task =>
        this.executeSingleTask(task, context, onEvent, executionOptions)
      );

      await Promise.allSettled(batchPromises);

      // 更新进度
      if (onProgress) {
        onProgress(this.createProgress(context));
      }
    }

    // 执行剩余的串行任务
    const serialTasks = plan.tasks.filter(task => !task.canRunInParallel);
    if (serialTasks.length > 0) {
      await this.executeSequential(context, onProgress, onEvent, executionOptions);
    }
  }

  /**
   * 基于优先级执行任务
   */
  private async executePriorityBased(
    context: ExecutionContext,
    onProgress?: (progress: ExecutionProgress) => void,
    onEvent?: (event: TaskExecutionEvent) => void,
    executionOptions?: AgentExecutionOptions
  ): Promise<void> {
    const { plan } = context;

    // 按优先级排序
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    const sortedTasks = [...plan.tasks].sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      return bPriority - aPriority;
    });

    for (const task of sortedTasks) {
      if (task.status === TaskStatus.CANCELLED) continue;

      context.currentTask = task;
      await this.executeSingleTask(task, context, onEvent, executionOptions);

      // 更新进度
      if (onProgress) {
        onProgress(this.createProgress(context));
      }

      // 高优先级任务失败时可能需要停止执行
      if (task.status === TaskStatus.FAILED && task.priority === 'critical') {
        break;
      }
    }
  }

  /**
   * 基于依赖关系的智能执行
   */
  private async executeDependencyAware(
    context: ExecutionContext,
    onProgress?: (progress: ExecutionProgress) => void,
    onEvent?: (event: TaskExecutionEvent) => void,
    executionOptions?: AgentExecutionOptions
  ): Promise<void> {
    const { plan } = context;
    const completedTaskIds = new Set<string>();
    const failedTaskIds = new Set<string>();

    while (completedTaskIds.size + failedTaskIds.size < plan.tasks.length) {
      // 找到可以执行的任务（依赖已满足）
      const readyTasks = plan.tasks.filter(task => {
        if (task.status !== TaskStatus.PENDING || completedTaskIds.has(task.id) || failedTaskIds.has(task.id)) {
          return false;
        }

        // 检查依赖
        for (const dependency of task.dependencies) {
          if (dependency.condition === 'success' && !completedTaskIds.has(dependency.taskId)) {
            return false;
          }
          if (dependency.condition === 'failure' && !failedTaskIds.has(dependency.taskId)) {
            return false;
          }
          if (dependency.condition === 'completion' &&
              !completedTaskIds.has(dependency.taskId) &&
              !failedTaskIds.has(dependency.taskId)) {
            return false;
          }
        }

        return true;
      });

      if (readyTasks.length === 0) {
        // 没有可执行的任务，检查是否有循环依赖
        break;
      }

      // 分离可并行和必须串行执行的任务
      const parallelTasks = readyTasks.filter(task => task.canRunInParallel);
      const serialTasks = readyTasks.filter(task => !task.canRunInParallel);

      // 先执行串行任务
      for (const task of serialTasks) {
        context.currentTask = task;
        await this.executeSingleTask(task, context, onEvent, executionOptions);

        if (task.status === TaskStatus.COMPLETED) {
          completedTaskIds.add(task.id);
        } else if (task.status === TaskStatus.FAILED) {
          failedTaskIds.add(task.id);
        }

        // 更新进度
        if (onProgress) {
          onProgress(this.createProgress(context));
        }
      }

      // 然后并行执行并行任务
      if (parallelTasks.length > 0) {
        const maxConcurrency = plan.config.maxConcurrentTasks || 3;
        const batches = this.createBatches(parallelTasks, maxConcurrency);

        for (const batch of batches) {
          const batchPromises = batch.map(task =>
            this.executeSingleTask(task, context, onEvent, executionOptions)
          );

          await Promise.allSettled(batchPromises);

          // 更新完成状态
          for (const task of batch) {
            if (task.status === TaskStatus.COMPLETED) {
              completedTaskIds.add(task.id);
            } else if (task.status === TaskStatus.FAILED) {
              failedTaskIds.add(task.id);
            }
          }

          // 更新进度
          if (onProgress) {
            onProgress(this.createProgress(context));
          }
        }
      }

      // 应用依赖输出映射
      this.applyDependencyMappings(plan, completedTaskIds, context.sharedData);
    }
  }

  /**
   * 执行单个任务
   */
  private async executeSingleTask(
    task: PlannedTask,
    context: ExecutionContext,
    onEvent?: (event: TaskExecutionEvent) => void,
    executionOptions?: AgentExecutionOptions
  ): Promise<AgentResult> {
    // 更新任务状态
    task.status = TaskStatus.RUNNING;
    task.startedAt = Date.now();

    // 发送任务开始事件
    this.emitEvent({
      type: 'task_started',
      planId: context.plan.id,
      taskId: task.id,
      timestamp: Date.now(),
      data: { taskName: task.name, taskType: task.taskType }
    });

    try {
      // 检查是否为浏览器任务
      let result: AgentResult;
      if (task.taskType.startsWith('browser_') && task.browserActions) {
        result = await this.browserExecutor.executeBrowserTask(
          task,
          executionOptions?.context,
          undefined
        );
      } else {
        const enrichedParameters = this.applyDependencyMappingsToTask(task, context.sharedData);

        const ctx: AgentContext = {
          timestamp: executionOptions?.context?.timestamp ?? task.context?.timestamp ?? Date.now(),
          selectedText: executionOptions?.context?.selectedText ?? task.context?.selectedText,
          currentUrl: executionOptions?.context?.currentUrl ?? task.context?.currentUrl,
          pageTitle: executionOptions?.context?.pageTitle ?? task.context?.pageTitle,
          userAgent: executionOptions?.context?.userAgent ?? task.context?.userAgent
        };

        const taskOptions: AgentExecutionOptions = {
          ...executionOptions,
          context: ctx,
          browserActions: task.browserActions
        };

        result = await this.agent.executeTask(
          task.taskType,
          enrichedParameters,
          taskOptions
        );
      }

      task.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
      task.completedAt = Date.now();
      task.result = result;

      if (result.success) {
        context.sharedData[`task_${task.id}_result`] = result.data;
        context.completedTasks.push(task);
      } else {
        context.failedTasks.push(task);

        task.retryCount = task.retryCount ?? 0;
        if (task.retryCount < (task.maxRetries || 0)) {
          task.status = TaskStatus.PENDING;
          task.retryCount = task.retryCount + 1;

          this.emitEvent({
            type: 'task_retry',
            planId: context.plan.id,
            taskId: task.id,
            timestamp: Date.now(),
            data: { retryCount: task.retryCount, error: result.error }
          });

          await AgentUtils.delay(1000 * task.retryCount);
          return this.executeSingleTask(task, context, onEvent, executionOptions);
        }
      }

      // 发送任务完成事件
      this.emitEvent({
        type: result.success ? 'task_completed' : 'task_failed',
        planId: context.plan.id,
        taskId: task.id,
        timestamp: Date.now(),
        data: result,
        error: result.error
      });

      return result;

    } catch (error) {
      // 处理执行异常
      task.status = TaskStatus.FAILED;
      task.completedAt = Date.now();
      task.result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - (task.startedAt || Date.now())
      };

      context.failedTasks.push(task);

      this.emitEvent({
        type: 'task_failed',
        planId: context.plan.id,
        taskId: task.id,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return task.result;
    }
  }

  /**
   * 应用依赖输出映射到任务
   */
  private applyDependencyMappingsToTask(task: PlannedTask, sharedData: Record<string, any>): Record<string, any> {
    const enrichedParameters = { ...task.parameters };

    // 应用依赖映射
    for (const dependency of task.dependencies) {
      const dependencyResultKey = `task_${dependency.taskId}_result`;
      const dependencyResult = sharedData[dependencyResultKey];

      if (dependencyResult && dependency.outputMapping) {
        for (const [targetParam, sourcePath] of Object.entries(dependency.outputMapping)) {
          enrichedParameters[targetParam] = this.getNestedValue(dependencyResult, sourcePath);
        }
      }
    }

    return enrichedParameters;
  }

  /**
   * 应用依赖映射
   */
  private applyDependencyMappings(
    plan: TaskPlan,
    completedTaskIds: Set<string>,
    sharedData: Record<string, any>
  ): void {
    for (const task of plan.tasks) {
      if (completedTaskIds.has(task.id)) {
        for (const dependency of task.dependencies) {
          if (dependency.outputMapping) {
            const dependencyResultKey = `task_${dependency.taskId}_result`;
            const dependencyResult = sharedData[dependencyResultKey];

            if (dependencyResult) {
              for (const [targetParam, sourcePath] of Object.entries(dependency.outputMapping)) {
                sharedData[`dependency_${task.id}_${targetParam}`] = this.getNestedValue(dependencyResult, sourcePath);
              }
            }
          }
        }
      }
    }
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 创建批次
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 判断是否应该在失败后继续执行
   */
  private async shouldContinueAfterFailure(
    failedTask: PlannedTask,
    context: ExecutionContext
  ): Promise<boolean> {
    // 如果是关键任务失败，停止执行
    if (failedTask.priority === 'critical') {
      return false;
    }

    // 检查是否有其他任务依赖这个失败的的任务
    const dependentTasks = context.plan.tasks.filter(task =>
      task.dependencies.some(dep => dep.taskId === failedTask.id && dep.condition === 'success')
    );

    return dependentTasks.length === 0;
  }

  /**
   * 创建进度信息
   */
  private createProgress(context: ExecutionContext): ExecutionProgress {
    const { plan, completedTasks, failedTasks } = context;
    const totalTasks = plan.tasks.length;
    const runningTasks = plan.tasks.filter(task => task.status === TaskStatus.RUNNING).length;
    const pendingTasks = totalTasks - completedTasks.length - failedTasks.length - runningTasks;

    return {
      planId: plan.id,
      totalTasks,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      runningTasks,
      pendingTasks,
      percentage: Math.round(((completedTasks.length + failedTasks.length) / totalTasks) * 100),
      currentTaskName: context.currentTask?.name,
      overallStatus: this.determineOverallStatus(plan)
    };
  }

  /**
   * 确定总体状态
   */
  private determineOverallStatus(plan: TaskPlan): TaskStatus {
    const completedCount = plan.tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const failedCount = plan.tasks.filter(task => task.status === TaskStatus.FAILED).length;

    if (failedCount === 0 && completedCount === plan.tasks.length) {
      return TaskStatus.COMPLETED;
    }

    if (failedCount > 0 && completedCount === 0) {
      return TaskStatus.FAILED;
    }

    if (completedCount > 0 || failedCount > 0) {
      return TaskStatus.RUNNING;
    }

    return TaskStatus.PENDING;
  }

  /**
   * 更新计划最终状态
   */
  private updatePlanFinalStatus(plan: TaskPlan, context: ExecutionContext): void {
    const completedCount = plan.tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const failedCount = plan.tasks.filter(task => task.status === TaskStatus.FAILED).length;

    if (failedCount === 0 && completedCount === plan.tasks.length) {
      plan.status = 'completed';
    } else if (completedCount === 0 && failedCount > 0) {
      plan.status = 'failed';
    } else {
      plan.status = 'completed'; // 部分成功也视为完成
    }

    plan.actualDuration = Date.now() - context.startTime;
    plan.updatedAt = Date.now();
  }

  /**
   * 发送事件
   */
  private emitEvent(event: TaskExecutionEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
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

  /**
   * 获取执行上下文
   */
  getExecutionContext(planId: string): ExecutionContext | undefined {
    return this.executionContexts.get(planId);
  }

  /**
   * 停止执行
   */
  async stopExecution(planId: string): Promise<void> {
    const context = this.executionContexts.get(planId);
    if (context) {
      // 标记所有待执行的任务为已取消
      context.plan.tasks
        .filter(task => task.status === TaskStatus.PENDING)
        .forEach(task => {
          task.status = TaskStatus.CANCELLED;
        });

      context.plan.status = 'cancelled';
      context.plan.updatedAt = Date.now();

      this.emitEvent({
        type: 'plan_completed',
        planId,
        timestamp: Date.now(),
        data: { reason: 'stopped' }
      });

      this.executionContexts.delete(planId);
    }
  }
}
