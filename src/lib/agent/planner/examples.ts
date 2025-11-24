/**
 * Task Planner Examples
 *
 * 任务规划器的使用示例
 */

import { TaskPlanner } from './planner';
import { ExecutionStrategy } from './types';
import { AgentUtils } from './utils';
import type { AgentLLMProvider, AgentContext } from './types';

/**
 * 基础使用示例
 */
export function basicPlannerExample() {
  console.log('=== 任务规划器基础使用示例 ===');

  // 创建规划器
  const planner = new TaskPlanner({
    maxTasksPerPlan: 8,
    enableParallelExecution: true,
    maxConcurrentTasks: 2
  });

  // 配置 LLM 提供商
  const provider: AgentLLMProvider = {
    id: 'openai-provider',
    name: 'OpenAI',
    type: 'openai',
    apiKey: 'your-api-key-here',
    model: 'gpt-3.5-turbo',
    enabled: true,
    isDefault: true
  };

  // 创建上下文
  const context: AgentContext = {
    selectedText: '人工智能技术正在快速发展，深度学习、机器学习和自然语言处理等领域取得了重大突破。',
    currentUrl: 'https://example.com/ai-article',
    pageTitle: '人工智能发展趋势',
    timestamp: Date.now()
  };

  return { planner, provider, context };
}

/**
 * 简单文本处理示例
 */
export async function simpleTextProcessingExample() {
  console.log('=== 简单文本处理示例 ===');

  const { planner, provider, context } = basicPlannerExample();

  try {
    // 创建计划
    const planningResult = await planner.createPlan(
      '请对这段文字进行总结，并翻译成英文',
      context,
      provider
    );

    if (planningResult.success && planningResult.plan) {
      console.log('创建的计划:', planningResult.plan.name);
      console.log('任务数量:', planningResult.plan.tasks.length);

      // 执行计划
      const executedPlan = await planner.executePlan(planningResult.plan.id, {
        strategy: ExecutionStrategy.SEQUENTIAL,
        provider
      });

      console.log('执行完成，状态:', executedPlan.status);

      // 生成报告
      const report = planner.generateReport(executedPlan.id);
      console.log('执行报告:', report);

    } else {
      console.error('规划失败:', planningResult.error);
    }

  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

/**
 * 复杂内容分析示例
 */
export async function complexContentAnalysisExample() {
  console.log('=== 复杂内容分析示例 ===');

  const { planner, provider } = basicPlannerExample();

  try {
    // 一步式执行（创建并立即执行）
    const plan = await planner.executePrompt(
      `请分析以下文章的各个方面：提取关键信息，识别情感倾向，生成适合的标题，并提出改进建议。

      文章内容：机器学习是人工智能的一个重要分支，它通过算法使计算机系统能够从数据中学习和改进。
      深度学习作为机器学习的一个子领域，使用多层神经网络来模拟人脑的学习过程。`,
      {
        provider,
        strategy: ExecutionStrategy.DEPENDENCY_AWARE,
        onProgress: (progress) => {
          console.log(`进度: ${progress.percentage}% - 当前任务: ${progress.currentTaskName}`);
        },
        onEvent: (event) => {
          console.log(`事件: ${event.type}`, event.taskId || event.planId);
        }
      }
    );

    console.log('复杂分析完成');
    console.log('执行结果:');
    plan.tasks.forEach(task => {
      console.log(`- ${task.name}: ${task.status}`);
      if (task.result?.success) {
        console.log(`  结果: ${AgentUtils.truncateText(task.result.data || '', 100)}`);
      }
    });

  } catch (error) {
    console.error('复杂分析失败:', error);
  }
}

/**
 * 代码开发任务示例
 */
export async function codeDevelopmentExample() {
  console.log('=== 代码开发任务示例 ===');

  const { planner, provider } = basicPlannerExample();

  try {
    const plan = await planner.executePrompt(
      `我需要开发一个用户管理系统，包括以下功能：
      1. 用户注册和登录功能
      2. 用户信息管理
      3. 权限控制
      4. 数据持久化

      请生成相应的JavaScript代码，并提供详细说明。`,
      {
        provider,
        strategy: ExecutionStrategy.PRIORITY_BASED,
        onProgress: (progress) => {
          console.log(`开发进度: ${progress.completedTasks}/${progress.totalTasks} 完成`);
        }
      }
    );

    console.log('代码开发任务完成');

    // 获取特定任务的结果
    const codeTask = plan.tasks.find(task => task.taskType === 'generate_code');
    if (codeTask?.result?.success) {
      console.log('生成的代码:');
      console.log(codeTask.result.data);
    }

  } catch (error) {
    console.error('代码开发失败:', error);
  }
}

/**
 * 并行执行示例
 */
export async function parallelExecutionExample() {
  console.log('=== 并行执行示例 ===');

  const { planner, provider } = basicPlannerExample();

  try {
    const plan = await planner.executePrompt(
      `请对以下内容同时进行多种分析：
      - 提取关键词
      - 情感分析
      - 内容总结

      文本：人工智能正在改变我们的生活方式，从智能手机到自动驾驶汽车，AI技术无处不在。`,
      {
        provider,
        strategy: ExecutionStrategy.PARALLEL,
        onProgress: (progress) => {
          console.log(`并行进度: ${progress.percentage}% (运行中: ${progress.runningTasks})`);
        }
      }
    );

    console.log('并行分析完成');
    console.log('各任务结果:');
    plan.tasks.forEach(task => {
      console.log(`✓ ${task.name}: ${task.status} (${AgentUtils.formatTime(task.result?.executionTime || 0)})`);
    });

  } catch (error) {
    console.error('并行执行失败:', error);
  }
}

/**
 * 交互式规划示例
 */
export async function interactivePlanningExample() {
  console.log('=== 交互式规划示例 ===');

  const { planner, provider } = basicPlannerExample();

  try {
    // 1. 首先创建计划，但不执行
    const planningResult = await planner.createPlan(
      '请帮我分析这篇技术文章，并生成一个详细的总结报告',
      undefined,
      provider
    );

    if (planningResult.success && planningResult.plan) {
      const plan = planningResult.plan;

      console.log('生成的任务计划:');
      plan.tasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.name} (${task.priority})`);
        console.log(`   描述: ${task.description}`);
        console.log(`   类型: ${task.taskType}`);
        if (task.dependencies.length > 0) {
          console.log(`   依赖: ${task.dependencies.map(d => d.taskId).join(', ')}`);
        }
      });

      // 2. 用户确认后执行
      console.log('\n开始执行计划...');

      const executedPlan = await planner.executePlan(plan.id, {
        strategy: ExecutionStrategy.DEPENDENCY_AWARE,
        provider,
        onProgress: (progress) => {
          const bar = '█'.repeat(Math.floor(progress.percentage / 5));
          console.log(`[${bar.padEnd(20)}] ${progress.percentage}% - ${progress.currentTaskName}`);
        }
      });

      console.log('\n执行完成！');
      const report = planner.generateReport(executedPlan.id);
      console.log(report);

    } else {
      console.error('规划失败:', planningResult.error);
    }

  } catch (error) {
    console.error('交互式规划失败:', error);
  }
}

/**
 * 错误处理和重试示例
 */
export async function errorHandlingExample() {
  console.log('=== 错误处理和重试示例 ===');

  const { planner, provider } = basicPlannerExample();

  // 使用一个可能无效的 API 密钥来演示错误处理
  const invalidProvider: AgentLLMProvider = {
    ...provider,
    apiKey: 'invalid-key-for-testing'
  };

  try {
    const plan = await planner.executePrompt(
      '请翻译这段文本成日文：Hello, world!',
      {
        provider: invalidProvider,
        strategy: ExecutionStrategy.SEQUENTIAL,
        onEvent: (event) => {
          if (event.type === 'task_failed' || event.type === 'task_retry') {
            console.log(`事件: ${event.type} - ${event.error}`);
          }
        }
      }
    );

    console.log('执行完成，结果:');
    plan.tasks.forEach(task => {
      console.log(`${task.name}: ${task.status}`);
      if (task.result?.error) {
        console.log(`  错误: ${task.result.error}`);
      }
      if (task.retryCount && task.retryCount > 0) {
        console.log(`  重试次数: ${task.retryCount}`);
      }
    });

  } catch (error) {
    console.error('错误处理示例:', error);
  }
}

/**
 * 动态重新规划示例
 */
export async function dynamicReplanningExample() {
  console.log('=== 动态重新规划示例 ===');

  const { planner, provider } = basicPlannerExample();

  try {
    // 创建初始计划
    const planningResult = await planner.createPlan(
      '请分析这段文本并提供改进建议',
      undefined,
      provider
    );

    if (planningResult.success && planningResult.plan) {
      const plan = planningResult.plan;
      console.log('初始计划任务数:', plan.tasks.length);

      // 开始执行
      const executionPromise = planner.executePlan(plan.id, {
        provider,
        strategy: ExecutionStrategy.SEQUENTIAL,
        onProgress: (progress) => {
          console.log(`进度: ${progress.percentage}%`);
        }
      });

      // 模拟在执行过程中发现问题并重新规划
      setTimeout(async () => {
        console.log('检测到需要调整计划...');

        // 假设第一个任务失败了，我们重新规划它
        const firstTask = plan.tasks[0];
        if (firstTask && firstTask.status === 'failed') {
          const replanningResult = await planner.replanTask(
            plan.id,
            firstTask.id,
            '请重新分析这段文本，重点关注实用性和可读性'
          );

          if (replanningResult.success) {
            console.log('重新规划成功');
          }
        }
      }, 2000);

      const finalPlan = await executionPromise;
      console.log('最终计划状态:', finalPlan.status);

    }

  } catch (error) {
    console.error('动态重新规划失败:', error);
  }
}

/**
 * 自定义任务模板示例
 */
export function customTaskTemplateExample() {
  console.log('=== 自定义任务模板示例 ===');

  // 这个示例展示如何扩展规划器以支持自定义任务模板
  const { planner } = basicPlannerExample();
  void planner;

  // 可以通过访问内部的分析器来添加自定义模板
  // 注意：这需要访问私有属性，在实际使用中可能需要提供公共API

  console.log('可以通过以下方式扩展规划器:');
  console.log('1. 自定义任务模板');
  console.log('2. 添加新的分析规则');
  console.log('3. 实现自定义执行策略');
  console.log('4. 集成外部工具和服务');
}

/**
 * 性能监控示例
 */
export async function performanceMonitoringExample() {
  console.log('=== 性能监控示例 ===');

  const { planner, provider } = basicPlannerExample();

  try {
    const startTime = Date.now();

    const plan = await planner.executePrompt(
      '请对这段文字进行全面分析：提取信息、分析情感、生成标题、翻译成多种语言',
      {
        provider,
        strategy: ExecutionStrategy.DEPENDENCY_AWARE,
        onProgress: (progress) => {
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          const estimatedTotal = (elapsedTime / progress.percentage) * 100;
          const remainingTime = estimatedTotal - elapsedTime;

          console.log(`进度: ${progress.percentage}% | 已用时: ${AgentUtils.formatTime(elapsedTime)} | 预计剩余: ${AgentUtils.formatTime(remainingTime)}`);
        }
      }
    );

    const totalTime = Date.now() - startTime;
    console.log('\n性能统计:');
    console.log(`总执行时间: ${AgentUtils.formatTime(totalTime)}`);
    console.log(`任务总数: ${plan.tasks.length}`);
    console.log(`平均任务时间: ${AgentUtils.formatTime(totalTime / plan.tasks.length)}`);

    // 按任务类型统计
    const statsByType: Record<string, { count: number; totalTime: number }> = {};
    plan.tasks.forEach(task => {
      if (!statsByType[task.taskType]) {
        statsByType[task.taskType] = { count: 0, totalTime: 0 };
      }
      statsByType[task.taskType].count++;
      statsByType[task.taskType].totalTime += task.result?.executionTime || 0;
    });

    console.log('\n按任务类型统计:');
    Object.entries(statsByType).forEach(([type, stats]) => {
      console.log(`${type}: ${stats.count}个任务, 平均时间: ${AgentUtils.formatTime(stats.totalTime / stats.count)}`);
    });

  } catch (error) {
    console.error('性能监控失败:', error);
  }
}

/**
 * 运行所有示例
 */
export async function runAllPlannerExamples() {
  console.log('开始运行任务规划器示例...\n');

  try {
    console.log('1. 基础配置示例:');
    basicPlannerExample();

    console.log('\n2. 简单文本处理示例:');
    // await simpleTextProcessingExample(); // 需要实际的 API 密钥

    console.log('\n3. 复杂内容分析示例:');
    // await complexContentAnalysisExample(); // 需要实际的 API 密钥

    console.log('\n4. 代码开发任务示例:');
    // await codeDevelopmentExample(); // 需要实际的 API 密钥

    console.log('\n5. 并行执行示例:');
    // await parallelExecutionExample(); // 需要实际的 API 密钥

    console.log('\n6. 交互式规划示例:');
    // await interactivePlanningExample(); // 需要实际的 API 密钥

    console.log('\n7. 错误处理示例:');
    // await errorHandlingExample(); // 需要实际的 API 密钥

    console.log('\n8. 动态重新规划示例:');
    // await dynamicReplanningExample(); // 需要实际的 API 密钥

    console.log('\n9. 自定义任务模板示例:');
    customTaskTemplateExample();

    console.log('\n10. 性能监控示例:');
    // await performanceMonitoringExample(); // 需要实际的 API 密钥

    console.log('\n注意：需要配置有效的 LLM 提供商 API 密钥才能运行实际的任务执行示例。');

  } catch (error) {
    console.error('示例运行失败:', error);
  }
}

// 导出示例函数供外部调用
export const plannerExamples = {
  basicPlannerExample,
  simpleTextProcessingExample,
  complexContentAnalysisExample,
  codeDevelopmentExample,
  parallelExecutionExample,
  interactivePlanningExample,
  errorHandlingExample,
  dynamicReplanningExample,
  customTaskTemplateExample,
  performanceMonitoringExample,
  runAllPlannerExamples
};
