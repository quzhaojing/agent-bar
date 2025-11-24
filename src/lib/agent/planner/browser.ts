/**
 * Agent Browser Automation Module
 *
 * 这个文件实现了浏览器自动化相关的功能
 */

import type { BrowserAction, AgentContext } from './types';

/**
 * 浏览器操作执行器
 */
export class BrowserActionExecutor {
  /**
   * 执行浏览器操作
   */
  static async executeAction(action: BrowserAction, _context?: AgentContext): Promise<any> {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined') {
      throw new Error('浏览器操作需要在浏览器环境中执行');
    }

    switch (action.type) {
      case 'click':
        return this.click(action);
      case 'type':
        return this.type(action);
      case 'scroll':
        return this.scroll(action);
      case 'navigate':
        return this.navigate(action);
      case 'wait':
        return this.wait(action);
      case 'extract':
        return this.extract(action);
      case 'screenshot':
        return this.screenshot(action);
      default:
        throw new Error(`不支持的浏览器操作类型: ${action.type}`);
    }
  }

  /**
   * 点击元素
   */
  private static async click(action: BrowserAction): Promise<any> {
    if (!action.selector) {
      throw new Error('点击操作需要指定选择器');
    }

    const element = document.querySelector(action.selector);
    if (!element) {
      throw new Error(`未找到元素: ${action.selector}`);
    }

    // 模拟点击事件
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });

    element.dispatchEvent(clickEvent);

    return {
      success: true,
      action: 'click',
      selector: action.selector,
      tagName: element.tagName,
      text: (element as HTMLElement).innerText || ''
    };
  }

  /**
   * 输入文本
   */
  private static async type(action: BrowserAction): Promise<any> {
    if (!action.selector) {
      throw new Error('输入操作需要指定选择器');
    }

    if (action.value === undefined) {
      throw new Error('输入操作需要指定值');
    }

    const element = document.querySelector(action.selector) as HTMLInputElement | HTMLTextAreaElement;
    if (!element) {
      throw new Error(`未找到输入元素: ${action.selector}`);
    }

    // 检查元素是否是可输入的
    if (!['INPUT', 'TEXTAREA'].includes(element.tagName)) {
      throw new Error(`元素不是输入框: ${action.selector}`);
    }

    // 清空并输入新值
    element.value = action.value;

    // 触发输入事件
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);

    return {
      success: true,
      action: 'type',
      selector: action.selector,
      value: action.value,
      tagName: element.tagName
    };
  }

  /**
   * 滚动页面
   */
  private static async scroll(action: BrowserAction): Promise<any> {
    const { coordinates, selector } = action;

    if (selector) {
      // 滚动到指定元素
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`未找到元素: ${selector}`);
      }
      element.scrollIntoView({ behavior: 'smooth' });
    } else if (coordinates) {
      // 滚动到指定坐标
      window.scrollTo({
        left: coordinates.x || 0,
        top: coordinates.y || 0,
        behavior: 'smooth'
      });
    } else {
      throw new Error('滚动操作需要指定选择器或坐标');
    }

    return {
      success: true,
      action: 'scroll',
      coordinates,
      selector,
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      }
    };
  }

  /**
   * 导航到新页面
   */
  private static async navigate(action: BrowserAction): Promise<any> {
    const url = action.value;
    if (!url) {
      throw new Error('导航操作需要指定URL');
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch {
      // 如果不是完整URL，假设是相对路径
      const baseUrl = window.location.origin;
      new URL(url, baseUrl);
    }

    window.location.href = url;

    return {
      success: true,
      action: 'navigate',
      url,
      previousUrl: window.location.href
    };
  }

  /**
   * 等待
   */
  private static async wait(action: BrowserAction): Promise<any> {
    const timeout = action.timeout || 1000;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          action: 'wait',
          timeout
        });
      }, timeout);
    });
  }

  /**
   * 提取页面内容
   */
  private static async extract(action: BrowserAction): Promise<any> {
    const options = action.options || {};
    const result: any = {
      success: true,
      action: 'extract'
    };

    // 基础页面信息
    result.pageInfo = {
      title: document.title,
      url: window.location.href,
      timestamp: Date.now()
    };

    // 提取特定选择器的内容
    if (options.selectors) {
      result.extractedContent = {};

      for (const selectorName in options.selectors) {
        try {
          const selector = options.selectors[selectorName];
          const elements = document.querySelectorAll(selector);
          const content = Array.from(elements).map(el => ({
            text: el.textContent?.trim() || '',
            html: el.outerHTML,
            tagName: el.tagName,
            attributes: this.getElementAttributes(el)
          }));

          result.extractedContent[selectorName] = content;
        } catch (error) {
          result.extractedContent[selectorName] = {
            error: error instanceof Error ? error.message : '提取失败'
          };
        }
      }
    }

    // 提取表单数据
    if (options.includeForms) {
      result.forms = this.extractFormData();
    }

    // 提取链接
    if (options.includeLinks) {
      result.links = this.extractLinks();
    }

    // 提取图片
    if (options.includeImages) {
      result.images = this.extractImages();
    }

    // 提取元数据
    if (options.includeMeta) {
      result.metadata = this.extractMetadata();
    }

    return result;
  }

  /**
   * 截图
   */
  private static async screenshot(_action: BrowserAction): Promise<any> {
    // 注意：实际的截图功能需要浏览器扩展权限或其他库支持
    // 这里提供一个基础实现框架

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('当前环境不支持截图功能');
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      // 这里可以将流转换为图片数据
      // 实际实现需要更多的处理逻辑

      return {
        success: true,
        action: 'screenshot',
        message: '截图功能需要进一步实现',
        streamId: stream.id
      };
    } catch (error) {
      throw new Error(`截图失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取元素属性
   */
  private static getElementAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};

    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }

    return attributes;
  }

  /**
   * 提取表单数据
   */
  private static extractFormData(): any[] {
    const forms = Array.from(document.querySelectorAll('form'));
    return forms.map(form => ({
      action: form.action,
      method: form.method,
      fields: Array.from(form.elements).map(element => {
        const input = element as HTMLInputElement;
        return {
          name: input.name,
          type: input.type,
          value: input.value,
          checked: input.checked,
          tagName: input.tagName
        };
      })
    }));
  }

  /**
   * 提取链接
   */
  private static extractLinks(): any[] {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links.map(link => ({
      href: (link as HTMLAnchorElement).href,
      text: link.textContent?.trim() || '',
      title: link.getAttribute('title') || '',
      target: link.getAttribute('target') || ''
    }));
  }

  /**
   * 提取图片
   */
  private static extractImages(): any[] {
    const images = Array.from(document.querySelectorAll('img'));
    return images.map(img => ({
      src: (img as HTMLImageElement).src,
      alt: img.getAttribute('alt') || '',
      title: img.getAttribute('title') || '',
      width: (img as HTMLImageElement).width,
      height: (img as HTMLImageElement).height
    }));
  }

  /**
   * 提取元数据
   */
  private static extractMetadata(): any {
    return {
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content'),
      author: document.querySelector('meta[name="author"]')?.getAttribute('content'),
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
      charset: document.characterSet,
      language: document.documentElement.lang,
      lastModified: document.lastModified
    };
  }
}

/**
 * 批量执行浏览器操作
 */
export class BrowserActionBatch {
  private actions: BrowserAction[] = [];
  private context?: AgentContext;

  constructor(context?: AgentContext) {
    this.context = context;
  }

  /**
   * 添加操作
   */
  addAction(action: BrowserAction): this {
    this.actions.push(action);
    return this;
  }

  /**
   * 批量执行操作
   */
  async execute(): Promise<any[]> {
    const results: any[] = [];

    for (const action of this.actions) {
      try {
        const result = await BrowserActionExecutor.executeAction(action, this.context);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          action: action.type,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return results;
  }

  /**
   * 清空操作列表
   */
  clear(): this {
    this.actions = [];
    return this;
  }
}
