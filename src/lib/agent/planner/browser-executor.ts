/**
 * Browser Task Executor
 *
 * 专门负责执行浏览器操作任务
 */

import { BrowserActionBatch } from './browser';
import type {
  PlannedTask,
  BrowserAction,
  AgentContext,
  AgentResult
} from './types';
import { BrowserTaskAnalyzer, PageAnalysis } from './browser-analyzer';

/**
 * 浏览器操作执行结果
 */
export interface BrowserExecutionResult {
  success: boolean;
  actions: BrowserActionResult[];
  pageState?: PageState;
  error?: string;
  executionTime: number;
  screenshots?: string[];
}

/**
 * 单个浏览器操作结果
 */
export interface BrowserActionResult {
  action: BrowserAction;
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  screenshot?: string;
}

/**
 * 页面状态
 */
export interface PageState {
  url: string;
  title: string;
  timestamp: number;
  elementCount: number;
  visibleElementCount: number;
  scrollPosition: { x: number; y: number };
  viewportSize: { width: number; height: number };
}

/**
 * 浏览器任务执行器
 */
export class BrowserTaskExecutor {
  private browserAnalyzer: BrowserTaskAnalyzer;
  private executionHistory: Map<string, BrowserExecutionResult[]> = new Map();

  constructor() {
    this.browserAnalyzer = new BrowserTaskAnalyzer();
  }

  /**
   * 执行浏览器任务
   */
  async executeBrowserTask(
    task: PlannedTask,
    context?: AgentContext,
    pageAnalysis?: PageAnalysis
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // 如果没有页面分析，先分析当前页面
      if (!pageAnalysis) {
        pageAnalysis = await this.browserAnalyzer.analyzePage();
      }

      // 根据任务类型创建浏览器操作
      const browserActions = await this.createBrowserActions(task, pageAnalysis);

      if (browserActions.length === 0) {
        throw new Error('无法为任务创建浏览器操作');
      }

      // 执行浏览器操作
      const executionResult = await this.executeBrowserActions(browserActions, context);

      // 记录执行历史
      this.recordExecution(task.id, executionResult);

      // 创建任务结果
      const taskResult: AgentResult = {
        success: executionResult.success,
        data: this.formatTaskResult(executionResult, task),
        executionTime: Date.now() - startTime,
        metadata: {
          actionsCount: browserActions.length,
          pageState: executionResult.pageState,
          screenshots: executionResult.screenshots
        }
      };

      if (!executionResult.success && executionResult.error) {
        taskResult.error = executionResult.error;
      }

      return taskResult;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 创建浏览器操作
   */
  private async createBrowserActions(
    task: PlannedTask,
    pageAnalysis: PageAnalysis
  ): Promise<BrowserAction[]> {
    const actions: BrowserAction[] = [];

    // 根据任务参数创建相应的浏览器操作
    for (const [paramName, paramValue] of Object.entries(task.parameters)) {
      const action = await this.createActionFromParameter(
        task.taskType,
        paramName,
        paramValue,
        pageAnalysis
      );

      if (action) {
        actions.push(action);
      }
    }

    // 如果没有从参数创建操作，尝试基于任务类型创建默认操作
    if (actions.length === 0) {
      const defaultAction = await this.createDefaultAction(task, pageAnalysis);
      if (defaultAction) {
        actions.push(defaultAction);
      }
    }

    return actions;
  }

  /**
   * 根据参数创建操作
   */
  private async createActionFromParameter(
    taskType: string,
    paramName: string,
    paramValue: any,
    pageAnalysis: PageAnalysis
  ): Promise<BrowserAction | null> {
    switch (taskType) {
      case 'browser_click':
        if (paramName === 'selector') {
          return {
            type: 'click',
            selector: this.resolveSelector(paramValue, pageAnalysis)
          };
        }
        break;

      case 'browser_type':
        if (paramName === 'selector') {
          return {
            type: 'click', // 先点击输入框
            selector: this.resolveSelector(paramValue, pageAnalysis)
          };
        } else if (paramName === 'value') {
          // 输入操作需要先创建点击操作
          const inputSelector = this.findInputSelector(pageAnalysis);
          if (inputSelector) {
            return {
              type: 'type',
              selector: inputSelector,
              value: String(paramValue)
            };
          }
        }
        break;

      case 'browser_scroll':
        if (paramName === 'direction' || paramName === 'coordinates') {
          return {
            type: 'scroll',
            coordinates: typeof paramValue === 'object' ? paramValue : undefined,
            selector: typeof paramValue === 'string' ? paramValue : undefined
          };
        }
        break;

      case 'browser_navigate':
        if (paramName === 'url') {
          return {
            type: 'navigate',
            value: String(paramValue)
          };
        }
        break;

      case 'browser_wait':
        if (paramName === 'duration' || paramName === 'timeout') {
          return {
            type: 'wait',
            timeout: typeof paramValue === 'number' ? paramValue : 1000
          };
        }
        break;

      case 'browser_extract':
        if (paramName === 'options') {
          return {
            type: 'extract',
            options: paramValue
          };
        }
        break;

      case 'browser_screenshot':
        return {
          type: 'screenshot'
        };

      case 'browser_hover':
        if (paramName === 'selector') {
          return {
            type: 'click', // 暂时用click代替hover
            selector: this.resolveSelector(paramValue, pageAnalysis)
          };
        }
        break;

      case 'browser_select':
        if (paramName === 'selector') {
          return {
            type: 'click', // 先点击选择框
            selector: this.resolveSelector(paramValue, pageAnalysis)
          };
        } else if (paramName === 'value') {
          return {
            type: 'click', // 然后点击选项
            selector: this.findOptionSelector(paramValue, pageAnalysis) || undefined
          };
        }
        break;
    }

    return null;
  }

  /**
   * 创建默认操作
   */
  private async createDefaultAction(
    task: PlannedTask,
    pageAnalysis: PageAnalysis
  ): Promise<BrowserAction | null> {
    switch (task.taskType) {
      case 'browser_click':
        const clickSelector = this.findClickableSelector(pageAnalysis);
        return clickSelector ? {
          type: 'click',
          selector: clickSelector
        } : null;

      case 'browser_type':
        const inputSelector = this.findInputSelector(pageAnalysis);
        return inputSelector ? {
          type: 'type',
          selector: inputSelector,
          value: '默认文本' // 或者从任务描述中提取
        } : null;

      case 'browser_scroll':
        return {
          type: 'scroll',
          coordinates: { x: 0, y: 500 } // 默认向下滚动500px
        };

      case 'browser_wait':
        return {
          type: 'wait',
          timeout: 2000 // 默认等待2秒
        };

      case 'browser_extract':
        return {
          type: 'extract',
          options: {
            includeMeta: true,
            includeLinks: true
          }
        };

      case 'browser_screenshot':
        return {
          type: 'screenshot'
        };

      default:
        return null;
    }
  }

  /**
   * 解析选择器
   */
  private resolveSelector(selectorValue: any, pageAnalysis: PageAnalysis): string {
    if (typeof selectorValue === 'string') {
      return selectorValue;
    }

    if (typeof selectorValue === 'object' && selectorValue.selector) {
      return selectorValue.selector;
    }

    // 尝试从页面分析中查找匹配的元素
    return this.findBestSelector(selectorValue, pageAnalysis);
  }

  /**
   * 查找最佳选择器
   */
  private findBestSelector(target: any, pageAnalysis: PageAnalysis): string {
    const targetStr = String(target).toLowerCase();

    // 查找按钮
    for (const button of pageAnalysis.buttons) {
      if (button.text && button.text.toLowerCase().includes(targetStr)) {
        return button.selector;
      }
    }

    // 查找链接
    for (const link of pageAnalysis.links) {
      if (link.text && link.text.toLowerCase().includes(targetStr)) {
        return link.selector;
      }
    }

    // 查找输入框
    for (const input of pageAnalysis.inputs) {
      if (input.placeholder && input.placeholder.toLowerCase().includes(targetStr)) {
        return input.selector;
      }
      if (input.name && input.name.toLowerCase().includes(targetStr)) {
        return input.selector;
      }
    }

    return 'body'; // 默认选择器
  }

  /**
   * 查找可点击的选择器
   */
  private findClickableSelector(pageAnalysis: PageAnalysis): string | null {
    // 优先查找提交按钮
    for (const button of pageAnalysis.buttons) {
      if (button.text && /submit|登录|确认|提交/i.test(button.text)) {
        return button.selector;
      }
    }

    // 查找任何按钮
    if (pageAnalysis.buttons.length > 0) {
      return pageAnalysis.buttons[0].selector;
    }

    // 查找链接
    if (pageAnalysis.links.length > 0) {
      return pageAnalysis.links[0].selector;
    }

    return null;
  }

  /**
   * 查找输入框选择器
   */
  private findInputSelector(pageAnalysis: PageAnalysis): string | null {
    // 优先查找文本输入框
    for (const input of pageAnalysis.inputs) {
      if (input.type === 'text' || input.type === 'email' || input.type === 'search') {
        return input.selector;
      }
    }

    // 查找任何输入框
    if (pageAnalysis.inputs.length > 0) {
      return pageAnalysis.inputs[0].selector;
    }

    return null;
  }

  /**
   * 查找选项选择器
   */
  private findOptionSelector(value: any, pageAnalysis: PageAnalysis): string | null {
    const valueStr = String(value).toLowerCase();

    // 这里需要更复杂的逻辑来查找下拉选项
    // 简化实现：查找包含该值的选项
    for (const element of pageAnalysis.elements) {
      if (element.text && element.text.toLowerCase().includes(valueStr)) {
        return element.selector;
      }
    }

    return null;
  }

  /**
   * 执行浏览器操作
   */
  private async executeBrowserActions(
    actions: BrowserAction[],
    context?: AgentContext
  ): Promise<BrowserExecutionResult> {
    const startTime = Date.now();
    const results: BrowserActionResult[] = [];
    const screenshots: string[] = [];

    try {
      // 创建浏览器操作批次
      const batch = new BrowserActionBatch(context);

      // 添加所有操作到批次
      for (const action of actions) {
        batch.addAction(action);
      }

      // 执行操作批次
      const actionResults = await batch.execute();

      // 转换结果格式
      for (let i = 0; i < actionResults.length; i++) {
        const actionResult = actionResults[i];
        const action = actions[i];

        results.push({
          action,
          success: actionResult.success,
          result: actionResult.result,
          error: actionResult.error,
          executionTime: 0, // 这里可以添加更精确的时间测量
          screenshot: actionResult.result?.screenshot
        });

        if (actionResult.result?.screenshot) {
          screenshots.push(actionResult.result.screenshot);
        }
      }

      // 获取页面状态
      const pageState = await this.getCurrentPageState();

      return {
        success: results.every(result => result.success),
        actions: results,
        pageState,
        executionTime: Date.now() - startTime,
        screenshots
      };

    } catch (error) {
      return {
        success: false,
        actions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 获取当前页面状态
   */
  private async getCurrentPageState(): Promise<PageState> {
    if (typeof window === 'undefined') {
      return this.createEmptyPageState();
    }

    try {
      const elements = document.querySelectorAll('*');
      const visibleElements = Array.from(elements).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      return {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        elementCount: elements.length,
        visibleElementCount: visibleElements.length,
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        },
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

    } catch (error) {
      return this.createEmptyPageState();
    }
  }

  /**
   * 创建空的页面状态
   */
  private createEmptyPageState(): PageState {
    return {
      url: '',
      title: '',
      timestamp: Date.now(),
      elementCount: 0,
      visibleElementCount: 0,
      scrollPosition: { x: 0, y: 0 },
      viewportSize: { width: 0, height: 0 }
    };
  }

  /**
   * 格式化任务结果
   */
  private formatTaskResult(executionResult: BrowserExecutionResult, task: PlannedTask): any {
    const result: any = {
      taskType: task.taskType,
      taskName: task.name,
      success: executionResult.success,
      actionsCount: executionResult.actions.length,
      executionTime: executionResult.executionTime
    };

    // 添加操作结果
    result.actions = executionResult.actions.map(actionResult => ({
      type: actionResult.action.type,
      selector: actionResult.action.selector,
      success: actionResult.success,
      result: actionResult.result
    }));

    // 添加页面状态信息
    if (executionResult.pageState) {
      result.pageState = {
        url: executionResult.pageState.url,
        title: executionResult.pageState.title,
        elementCount: executionResult.pageState.elementCount
      };
    }

    // 添加提取的数据
    const extractActions = executionResult.actions.filter(action => action.action.type === 'extract');
    if (extractActions.length > 0) {
      result.extractedData = extractActions[0].result;
    }

    // 添加截图信息
    if (executionResult.screenshots && executionResult.screenshots.length > 0) {
      result.screenshotsCount = executionResult.screenshots.length;
    }

    return result;
  }

  /**
   * 记录执行历史
   */
  private recordExecution(taskId: string, result: BrowserExecutionResult): void {
    if (!this.executionHistory.has(taskId)) {
      this.executionHistory.set(taskId, []);
    }

    const history = this.executionHistory.get(taskId)!;
    history.push(result);

    // 保留最近10次执行记录
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(taskId: string): BrowserExecutionResult[] {
    return this.executionHistory.get(taskId) || [];
  }

  /**
   * 清除执行历史
   */
  clearExecutionHistory(taskId?: string): void {
    if (taskId) {
      this.executionHistory.delete(taskId);
    } else {
      this.executionHistory.clear();
    }
  }

  /**
   * 验证浏览器操作是否可执行
   */
  async validateBrowserActions(actions: BrowserAction[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (typeof window === 'undefined') {
      errors.push('浏览器操作需要在浏览器环境中执行');
      return { valid: false, errors };
    }

    for (const action of actions) {
      try {
        // 验证选择器
        if (action.selector) {
          const element = document.querySelector(action.selector);
          if (!element) {
            errors.push(`找不到元素: ${action.selector}`);
          }
        }

        // 验证操作类型
        const validTypes = ['click', 'type', 'scroll', 'navigate', 'wait', 'extract', 'screenshot'];
        if (!validTypes.includes(action.type)) {
          errors.push(`不支持的操作类型: ${action.type}`);
        }

        // 验证导航URL
        if (action.type === 'navigate' && action.value) {
          try {
            new URL(action.value);
          } catch {
            errors.push(`无效的URL: ${action.value}`);
          }
        }

      } catch (error) {
        errors.push(`操作验证失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 预览浏览器操作（不实际执行）
   */
  async previewBrowserActions(actions: BrowserAction[]): Promise<any[]> {
    const preview: any[] = [];

    for (const action of actions) {
      const previewItem: any = {
        type: action.type,
        description: this.getActionDescription(action)
      };

      if (action.selector) {
        try {
          const element = document.querySelector(action.selector);
          if (element) {
            previewItem.element = {
              tag: element.tagName.toLowerCase(),
              text: element.textContent?.substring(0, 50),
              visible: element instanceof HTMLElement ? element.offsetParent !== null : true
            };
          } else {
            previewItem.element = { error: 'Element not found' };
          }
        } catch (error) {
          previewItem.element = { error: 'Query failed' };
        }
      }

      preview.push(previewItem);
    }

    return preview;
  }

  /**
   * 获取操作描述
   */
  private getActionDescription(action: BrowserAction): string {
    switch (action.type) {
      case 'click':
        return `点击元素: ${action.selector || '未知'}`;
      case 'type':
        return `在${action.selector || '输入框'}中输入: ${action.value || '文本'}`;
      case 'scroll':
        if (action.coordinates) {
          return `滚动到坐标: (${action.coordinates.x}, ${action.coordinates.y})`;
        }
        return `滚动到元素: ${action.selector || '未知'}`;
      case 'navigate':
        return `导航到: ${action.value || '未知URL'}`;
      case 'wait':
        return `等待: ${action.timeout || 1000}ms`;
      case 'extract':
        return `提取页面内容`;
      case 'screenshot':
        return `页面截图`;
      default:
        return `未知操作: ${action.type}`;
    }
  }
}
