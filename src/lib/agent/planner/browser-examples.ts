/**
 * Browser Task Planner Examples
 *
 * 浏览器操作任务规划器的使用示例
 */

import { TaskPlanner } from './planner';
import { ExecutionStrategy, AgentLLMProvider, AgentContext } from './types';
import { AgentUtils } from './utils';

/**
 * 基础浏览器操作示例
 */
export function basicBrowserExample() {
  console.log('=== 基础浏览器操作示例 ===');

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

  // 创建浏览器上下文
  const context: AgentContext = {
    currentUrl: 'https://example.com',
    pageTitle: '示例页面',
    timestamp: Date.now()
  };

  return { planner, provider, context };
}

/**
 * 页面导航和内容提取示例
 */
export async function navigationAndExtractionExample() {
  console.log('=== 页面导航和内容提取示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    // 导航到页面并提取内容
    const plan = await planner.executePrompt(
      `请帮我完成以下操作：
      1. 打开 https://news.example.com
      2. 滚动到页面底部
      3. 提取所有新闻标题
      4. 截图保存当前页面`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.SEQUENTIAL,
        onProgress: (progress) => {
          console.log(`进度: ${progress.percentage}% - ${progress.currentTaskName}`);
        }
      }
    );

    console.log('页面操作完成！');
    console.log('执行结果:');
    plan.tasks.forEach(task => {
      console.log(`✓ ${task.name}: ${task.status}`);
      if (task.result?.success && task.result.metadata?.extractedData) {
        console.log(`  提取数据: ${JSON.stringify(task.result.metadata.extractedData, null, 2).substring(0, 200)}...`);
      }
    });

  } catch (error) {
    console.error('页面操作失败:', error);
  }
}

/**
 * 表单填写示例
 */
export async function formFillingExample() {
  console.log('=== 表单填写示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    const plan = await planner.executePrompt(
      `请帮我填写登录表单：
      - 在用户名输入框中输入 "testuser"
      - 在密码输入框中输入 "password123"
      - 点击"登录"按钮
      - 等待页面加载完成
      - 验证登录是否成功`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.SEQUENTIAL,
        onProgress: (progress) => {
          console.log(`表单填写进度: ${progress.percentage}%`);
        }
      }
    );

    console.log('表单填写完成');

    // 检查执行结果
    const loginTask = plan.tasks.find(task => task.taskType === 'browser_click' &&
                                         task.name.includes('登录'));
    if (loginTask?.result?.success) {
      console.log('登录按钮点击成功');
    } else {
      console.log('登录过程可能失败');
    }

  } catch (error) {
    console.error('表单填写失败:', error);
  }
}

/**
* 搜索操作示例
 */
export async function searchOperationExample() {
  console.log('=== 搜索操作示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    const plan = await planner.executePrompt(
      `请帮我进行搜索操作：
      1. 在搜索框中输入 "人工智能最新发展"
      2. 点击搜索按钮
      3. 等待搜索结果加载
      4. 提取前5个搜索结果的标题和链接
      5. 点击第一个搜索结果`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.DEPENDENCY_AWARE,
        onProgress: (progress) => {
          console.log(`搜索进度: ${progress.completedTasks}/${progress.totalTasks}`);
        },
        onEvent: (event) => {
          if (event.type === 'task_completed') {
            console.log(`✅ 完成: ${event.data?.taskName}`);
          }
        }
      }
    );

    console.log('搜索操作完成');

    // 分析提取的搜索结果
    const extractTask = plan.tasks.find(task => task.taskType === 'browser_extract');
    if (extractTask?.result?.success) {
      const extractedData = extractTask.result.data;
      if (extractedData.extractedData?.links) {
        console.log('找到的链接数量:', extractedData.extractedData.links.length);
      }
    }

  } catch (error) {
    console.error('搜索操作失败:', error);
  }
}

/**
* 多步骤购物流程示例
 */
export async function shoppingWorkflowExample() {
  console.log('=== 多步骤购物流程示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    const plan = await planner.executePrompt(
      `请帮我完成以下购物流程：
      1. 打开购物网站 https://shop.example.com
      2. 搜索 "笔记本电脑"
      3. 筛选价格范围 5000-8000 元
      4. 按销量排序
      5. 点击第一个商品
      6. 查看商品详情
      7. 添加到购物车
      8. 截图保存商品信息`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.PRIORITY_BASED,
        onProgress: (progress) => {
          const statusIcon = progress.overallStatus === 'completed' ? '🎉' :
                            progress.overallStatus === 'running' ? '⏳' : '❌';
          console.log(`${statusIcon} 购物流程: ${progress.percentage}%`);
        }
      }
    );

    console.log('购物流程执行完成');

    // 生成执行报告
    const report = planner.generateReport(plan.id);
    console.log('\n=== 执行报告 ===');
    console.log(report);

  } catch (error) {
    console.error('购物流程失败:', error);
  }
}

/**
* 内容抓取示例
 */
export async function contentScrapingExample() {
  console.log('=== 内容抓取示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    const plan = await planner.executePrompt(
      `请帮我抓取页面内容：
      1. 打开 https://blog.example.com
      2. 提取所有文章标题
      3. 提取所有文章作者和发布日期
      4. 提取文章摘要
      5. 提取所有外部链接
      6. 保存数据到本地`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.PARALLEL,
        onProgress: (progress) => {
          console.log(`📊 数据抓取: ${progress.completedTasks}/${progress.totalTasks} 任务完成`);
        }
      }
    );

    console.log('内容抓取完成');

    // 统计抓取的数据
    let totalItems = 0;
    plan.tasks.forEach(task => {
      if (task.result?.success && task.result.data?.extractedData) {
        const data = task.result.data.extractedData;
        if (Array.isArray(data)) {
          totalItems += data.length;
        } else if (typeof data === 'object') {
          totalItems += Object.keys(data).length;
        }
      }
    });

    console.log(`总共抓取了 ${totalItems} 个数据项`);

  } catch (error) {
    console.error('内容抓取失败:', error);
  }
}

/**
* 页面性能测试示例
 */
export async function pagePerformanceTestExample() {
  console.log('=== 页面性能测试示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    const plan = await planner.executePrompt(
      `请帮我进行页面性能测试：
      1. 打开 https://example.com
      2. 等待页面完全加载
      3. 截图保存初始状态
      4. 滚动到页面中部，等待2秒
      5. 截图保存中部状态
      6. 滚动到页面底部，等待2秒
      7. 截图保存底部状态
      8. 提取页面性能相关信息`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.SEQUENTIAL,
        onEvent: (event) => {
          if (event.type === 'task_completed' && event.data?.taskType === 'browser_screenshot') {
            console.log(`📸 截图完成`);
          }
        }
      }
    );

    console.log('页面性能测试完成');

    // 统计截图数量
    const screenshotTasks = plan.tasks.filter(task => task.taskType === 'browser_screenshot');
    console.log(`共拍摄了 ${screenshotTasks.length} 张截图`);

  } catch (error) {
    console.error('页面性能测试失败:', error);
  }
}

/**
* 智能页面交互示例
 */
export async function intelligentInteractionExample() {
  console.log('=== 智能页面交互示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    const plan = await planner.executePrompt(
      `请帮我与页面智能交互：
      1. 分析当前页面结构
      2. 识别所有可点击的元素
      3. 找到最重要的操作按钮
      4. 点击"了解更多"按钮
      5. 等待新内容加载
      6. 提取新加载的内容
      7. 总结页面信息`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.DEPENDENCY_AWARE,
        onProgress: (progress) => {
          const bar = '█'.repeat(Math.floor(progress.percentage / 5));
          console.log(`[${bar.padEnd(20)}] ${progress.percentage}% - ${progress.currentTaskName}`);
        }
      }
    );

    console.log('智能交互完成');

    // 分析页面分析结果
    const extractTask = plan.tasks.find(task => task.taskType === 'browser_extract');
    if (extractTask?.result?.success) {
      const pageInfo = extractTask.result.data.pageState;
      if (pageInfo) {
        console.log('页面信息:');
        console.log(`- 标题: ${pageInfo.title}`);
        console.log(`- URL: ${pageInfo.url}`);
        console.log(`- 元素数量: ${pageInfo.elementCount}`);
        console.log(`- 可见元素数量: ${pageInfo.visibleElementCount}`);
      }
    }

  } catch (error) {
    console.error('智能交互失败:', error);
  }
}

/**
* 错误处理和重试示例
 */
export async function errorHandlingExample() {
  console.log('=== 错误处理和重试示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    const plan = await planner.executePrompt(
      `请帮我完成以下任务（包含可能的错误）：
      1. 打开一个不存在的页面 https://nonexistent.example.com
      2. 如果失败，重试打开 https://example.com
      3. 点击一个不存在的按钮 "不存在的按钮"
      4. 如果失败，点击第一个可见的按钮
      5. 提取页面信息`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.SEQUENTIAL,
        onEvent: (event) => {
          if (event.type === 'task_failed') {
            console.log(`❌ 任务失败: ${event.error}`);
          } else if (event.type === 'task_retry') {
            console.log(`🔄 重试任务: ${event.data?.retryCount} 次`);
          }
        }
      }
    );

    console.log('错误处理测试完成');

    // 统计成功和失败的任务
    const successTasks = plan.tasks.filter(task => task.status === 'completed');
    const failedTasks = plan.tasks.filter(task => task.status === 'failed');

    console.log(`✅ 成功任务: ${successTasks.length}`);
    console.log(`❌ 失败任务: ${failedTasks.length}`);

    failedTasks.forEach(task => {
      console.log(`  - ${task.name}: ${task.result?.error}`);
    });

  } catch (error) {
    console.error('错误处理测试失败:', error);
  }
}

/**
* 并行浏览器操作示例
 */
export async function parallelBrowserOperationsExample() {
  console.log('=== 并行浏览器操作示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    const plan = await planner.executePrompt(
      `请帮我同时执行多个浏览器操作：
      1. 提取页面所有标题
      2. 提取页面所有链接
      3. 提取页面所有图片
      4. 提取页面表单信息
      5. 分析页面结构`,
      {
        context,
        provider,
        strategy: ExecutionStrategy.PARALLEL,
        onProgress: (progress) => {
          console.log(`并行执行中: ${progress.runningTasks} 个任务同时运行`);
        }
      }
    );

    console.log('并行操作完成');

    // 计算总的执行时间
    const totalTime = plan.actualDuration || 0;
    console.log(`总执行时间: ${AgentUtils.formatTime(totalTime)}`);

    // 统计各种数据
    let totalData = 0;
    plan.tasks.forEach(task => {
      if (task.result?.success && task.result.data) {
        const data = task.result.data.extractedData || task.result.data;
        if (Array.isArray(data)) {
          totalData += data.length;
        }
      }
    });

    console.log(`总共提取了 ${totalData} 个数据项`);

  } catch (error) {
    console.error('并行操作失败:', error);
  }
}

/**
* 自定义浏览器工作流示例
 */
export async function customWorkflowExample() {
  console.log('=== 自定义浏览器工作流示例 ===');

  const { planner, provider, context } = basicBrowserExample();

  try {
    // 分步创建和执行自定义工作流
    console.log('1. 创建工作流计划...');
    const planningResult = await planner.createPlan(
      `创建一个自定义工作流：
      1. 访问目标网站
      2. 分析页面内容
      3. 找到关键信息
      4. 执行交互操作
      5. 收集结果数据`,
      context,
      provider
    );

    if (planningResult.success && planningResult.plan) {
      const plan = planningResult.plan;

      console.log('2. 查看生成的任务:');
      plan.tasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.name} (${task.taskType})`);
        console.log(`   优先级: ${task.priority}`);
        console.log(`   可并行: ${task.canRunInParallel}`);
      });

      console.log('\n3. 开始执行工作流...');
      const executedPlan = await planner.executePlan(plan.id, {
        strategy: ExecutionStrategy.DEPENDENCY_AWARE,
        provider,
        onProgress: (progress) => {
          console.log(`🔄 工作流进度: ${progress.percentage}%`);
        }
      });

      console.log('\n4. 工作流执行结果:');
      console.log(`- 状态: ${executedPlan.status}`);
      console.log(`- 执行时间: ${AgentUtils.formatTime(executedPlan.actualDuration || 0)}`);

      // 生成详细报告
      const report = planner.generateReport(executedPlan.id);
      console.log('\n=== 详细报告 ===');
      console.log(report);

    } else {
      console.error('工作流规划失败:', planningResult.error);
    }

  } catch (error) {
    console.error('自定义工作流失败:', error);
  }
}

/**
* 运行所有浏览器示例
 */
export async function runAllBrowserExamples() {
  console.log('开始运行浏览器操作示例...\n');

  try {
    console.log('1. 基础配置示例:');
    basicBrowserExample();

    console.log('\n2. 页面导航和内容提取示例:');
    // await navigationAndExtractionExample(); // 需要实际的 API 密钥

    console.log('\n3. 表单填写示例:');
    // await formFillingExample(); // 需要实际的 API 密钥

    console.log('\n4. 搜索操作示例:');
    // await searchOperationExample(); // 需要实际的 API 密钥

    console.log('\n5. 多步骤购物流程示例:');
    // await shoppingWorkflowExample(); // 需要实际的 API 密钥

    console.log('\n6. 内容抓取示例:');
    // await contentScrapingExample(); // 需要实际的 API 密钥

    console.log('\n7. 页面性能测试示例:');
    // await pagePerformanceTestExample(); // 需要实际的 API 密钥

    console.log('\n8. 智能页面交互示例:');
    // await intelligentInteractionExample(); // 需要实际的 API 密钥

    console.log('\n9. 错误处理和重试示例:');
    // await errorHandlingExample(); // 需要实际的 API 密钥

    console.log('\n10. 并行浏览器操作示例:');
    // await parallelBrowserOperationsExample(); // 需要实际的 API 密钥

    console.log('\n11. 自定义浏览器工作流示例:');
    // await customWorkflowExample(); // 需要实际的 API 密钥

    console.log('\n注意：需要配置有效的 LLM 提供商 API 密钥才能运行实际的浏览器操作示例。');
    console.log('浏览器操作需要在浏览器环境中执行才能生效。');

  } catch (error) {
    console.error('示例运行失败:', error);
  }
}

// 导出示例函数供外部调用
export const browserPlannerExamples = {
  basicBrowserExample,
  navigationAndExtractionExample,
  formFillingExample,
  searchOperationExample,
  shoppingWorkflowExample,
  contentScrapingExample,
  pagePerformanceTestExample,
  intelligentInteractionExample,
  errorHandlingExample,
  parallelBrowserOperationsExample,
  customWorkflowExample,
  runAllBrowserExamples
};
