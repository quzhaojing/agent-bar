/**
 * Browser Task Analyzer
 *
 * 专门负责分析浏览器操作相关的任务
 */

//
import { TaskPriority } from './types';

/**
 * 浏览器操作任务模板
 */
export interface BrowserTaskTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  actionType: 'click' | 'type' | 'scroll' | 'navigate' | 'wait' | 'extract' | 'screenshot' | 'hover' | 'select';
  parameterMapping: {
    [parameterName: string]: {
      source: 'prompt' | 'context' | 'page_analysis';
      extraction: string;
      required: boolean;
    };
  };
  priority: TaskPriority;
  estimatedDuration: number;
  canRunInParallel: boolean;
  requiresPageAnalysis: boolean;
  metadata?: { matchScore: number };
}

/**
 * 页面分析结果
 */
export interface PageAnalysis {
  url: string;
  title: string;
  elements: PageElement[];
  forms: FormInfo[];
  links: LinkInfo[];
  buttons: ButtonInfo[];
  inputs: InputInfo[];
  navigation: NavigationInfo[];
  content: ContentInfo;
}

/**
 * 页面元素信息
 */
export interface PageElement {
  selector: string;
  text: string;
  tag: string;
  attributes: Record<string, string>;
  visible: boolean;
  clickable: boolean;
  type?: string;
  name?: string;
  id?: string;
  class?: string;
  xpath?: string;
}

/**
 * 表单信息
 */
export interface FormInfo {
  selector: string;
  action?: string;
  method?: string;
  fields: FieldInfo[];
}

/**
 * 表单字段信息
 */
export interface FieldInfo {
  selector: string;
  type: string;
  name: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

/**
 * 链接信息
 */
export interface LinkInfo {
  selector: string;
  text: string;
  href: string;
  target?: string;
}

/**
 * 按钮信息
 */
export interface ButtonInfo {
  selector: string;
  text: string;
  type?: string;
  disabled: boolean;
  form?: string;
}

/**
 * 输入框信息
 */
export interface InputInfo {
  selector: string;
  type: string;
  name: string;
  placeholder?: string;
  value?: string;
  required: boolean;
  maxLength?: number;
}

/**
 * 导航信息
 */
export interface NavigationInfo {
  menu: string;
  items: NavigationItem[];
}

/**
 * 导航项
 */
export interface NavigationItem {
  text: string;
  href: string;
  selector: string;
}

/**
 * 内容信息
 */
export interface ContentInfo {
  headings: HeadingInfo[];
  paragraphs: string[];
  lists: ListInfo[];
  tables: TableInfo[];
  images: ImageInfo[];
}

/**
 * 标题信息
 */
export interface HeadingInfo {
  level: number;
  text: string;
  selector: string;
}

/**
 * 列表信息
 */
export interface ListInfo {
  type: 'ul' | 'ol';
  items: string[];
  selector: string;
}

/**
 * 表格信息
 */
export interface TableInfo {
  headers: string[];
  rows: string[][];
  selector: string;
}

/**
 * 图片信息
 */
export interface ImageInfo {
  src: string;
  alt?: string;
  title?: string;
  selector: string;
}

/**
 * 浏览器任务分析器
 */
export class BrowserTaskAnalyzer {
  private browserTemplates: Map<string, BrowserTaskTemplate> = new Map();

  constructor() {
    this.initializeBrowserTemplates();
  }

  /**
   * 初始化浏览器操作模板
   */
  private initializeBrowserTemplates(): void {
    // 点击操作模板
    this.addBrowserTemplate({
      id: 'click_template',
      name: '点击元素',
      description: '点击页面上的某个元素',
      keywords: ['点击', 'click', '选择', 'select', '按一下'],
      actionType: 'click',
      parameterMapping: {
        selector: {
          source: 'prompt',
          extraction: 'extract_element_selector',
          required: true
        },
        coordinates: {
          source: 'prompt',
          extraction: 'extract_coordinates',
          required: false
        }
      },
      priority: TaskPriority.HIGH,
      estimatedDuration: 1000,
      canRunInParallel: false,
      requiresPageAnalysis: true
    });

    // 输入文本模板
    this.addBrowserTemplate({
      id: 'type_template',
      name: '输入文本',
      description: '在输入框中输入文本',
      keywords: ['输入', 'type', '填写', '填入', '写入'],
      actionType: 'type',
      parameterMapping: {
        selector: {
          source: 'prompt',
          extraction: 'extract_input_selector',
          required: true
        },
        value: {
          source: 'prompt',
          extraction: 'extract_input_value',
          required: true
        }
      },
      priority: TaskPriority.HIGH,
      estimatedDuration: 2000,
      canRunInParallel: false,
      requiresPageAnalysis: true
    });

    // 滚动操作模板
    this.addBrowserTemplate({
      id: 'scroll_template',
      name: '滚动页面',
      description: '滚动页面或滚动到特定元素',
      keywords: ['滚动', 'scroll', '向下滑', '向上滑', '滚动到'],
      actionType: 'scroll',
      parameterMapping: {
        selector: {
          source: 'prompt',
          extraction: 'extract_scroll_target',
          required: false
        },
        coordinates: {
          source: 'prompt',
          extraction: 'extract_scroll_coordinates',
          required: false
        },
        direction: {
          source: 'prompt',
          extraction: 'extract_scroll_direction',
          required: false
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 1500,
      canRunInParallel: true,
      requiresPageAnalysis: false
    });

    // 导航操作模板
    this.addBrowserTemplate({
      id: 'navigate_template',
      name: '页面导航',
      description: '导航到新的页面',
      keywords: ['导航', 'navigate', '打开', '访问', '前往', '跳转'],
      actionType: 'navigate',
      parameterMapping: {
        value: {
          source: 'prompt',
          extraction: 'extract_navigation_url',
          required: true
        }
      },
      priority: TaskPriority.HIGH,
      estimatedDuration: 3000,
      canRunInParallel: false,
      requiresPageAnalysis: false
    });

    // 等待操作模板
    this.addBrowserTemplate({
      id: 'wait_template',
      name: '等待',
      description: '等待指定时间',
      keywords: ['等待', 'wait', '暂停', '延迟', '等一下'],
      actionType: 'wait',
      parameterMapping: {
        timeout: {
          source: 'prompt',
          extraction: 'extract_wait_duration',
          required: false
        }
      },
      priority: TaskPriority.LOW,
      estimatedDuration: 1000,
      canRunInParallel: true,
      requiresPageAnalysis: false
    });

    // 内容提取模板
    this.addBrowserTemplate({
      id: 'extract_template',
      name: '提取内容',
      description: '从页面提取内容',
      keywords: ['提取', 'extract', '获取', '抓取', '收集'],
      actionType: 'extract',
      parameterMapping: {
        options: {
          source: 'prompt',
          extraction: 'extract_extraction_options',
          required: false
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 2000,
      canRunInParallel: true,
      requiresPageAnalysis: true
    });

    // 截图模板
    this.addBrowserTemplate({
      id: 'screenshot_template',
      name: '页面截图',
      description: '对页面进行截图',
      keywords: ['截图', 'screenshot', '拍照', '截屏'],
      actionType: 'screenshot',
      parameterMapping: {},
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 1000,
      canRunInParallel: true,
      requiresPageAnalysis: false
    });

    // 悬停操作模板
    this.addBrowserTemplate({
      id: 'hover_template',
      name: '悬停元素',
      description: '鼠标悬停在元素上',
      keywords: ['悬停', 'hover', '鼠标移到', '停在'],
      actionType: 'hover',
      parameterMapping: {
        selector: {
          source: 'prompt',
          extraction: 'extract_element_selector',
          required: true
        }
      },
      priority: TaskPriority.MEDIUM,
      estimatedDuration: 1000,
      canRunInParallel: false,
      requiresPageAnalysis: true
    });

    // 选择操作模板
    this.addBrowserTemplate({
      id: 'select_template',
      name: '选择选项',
      description: '从下拉列表中选择选项',
      keywords: ['选择', 'select', '下拉', '选项'],
      actionType: 'select',
      parameterMapping: {
        selector: {
          source: 'prompt',
          extraction: 'extract_select_selector',
          required: true
        },
        value: {
          source: 'prompt',
          extraction: 'extract_select_value',
          required: true
        }
      },
      priority: TaskPriority.HIGH,
      estimatedDuration: 1500,
      canRunInParallel: false,
      requiresPageAnalysis: true
    });
  }

  /**
   * 添加浏览器操作模板
   */
  addBrowserTemplate(template: BrowserTaskTemplate): void {
    this.browserTemplates.set(template.id, template);
  }

  /**
   * 分析页面结构
   */
  async analyzePage(): Promise<PageAnalysis> {
    if (typeof window === 'undefined') {
      return this.createEmptyAnalysis();
    }

    try {
      const analysis: PageAnalysis = {
        url: window.location.href,
        title: document.title,
        elements: [],
        forms: [],
        links: [],
        buttons: [],
        inputs: [],
        navigation: [],
        content: {
          headings: [],
          paragraphs: [],
          lists: [],
          tables: [],
          images: []
        }
      };

      // 分析所有可见元素
      const allElements = document.querySelectorAll('*');
      for (const element of allElements) {
        const elementInfo = this.analyzeElement(element);
        if (elementInfo.visible) {
          analysis.elements.push(elementInfo);

          // 分类存储元素
          this.categorizeElement(element, elementInfo, analysis);
        }
      }

      return analysis;

    } catch (error) {
      console.error('页面分析失败:', error);
      return this.createEmptyAnalysis();
    }
  }

  /**
   * 分析单个元素
   */
  private analyzeElement(element: Element): PageElement {
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const elementInfo: PageElement = {
      selector: this.generateSelector(element),
      text: element.textContent?.trim() || '',
      tag: element.tagName.toLowerCase(),
      attributes: this.getElementAttributes(element),
      visible: this.isVisible(computedStyle, rect),
      clickable: this.isClickable(element, computedStyle),
      xpath: this.generateXPath(element)
    };

    // 添加特定元素类型的属性
    if (element instanceof HTMLInputElement) {
      elementInfo.type = element.type;
      elementInfo.name = element.name;
      elementInfo.id = element.id;
      if (element.className) {
        elementInfo.class = element.className;
      }
    } else if (element instanceof HTMLButtonElement) {
      elementInfo.type = element.type;
      elementInfo.name = element.name;
      elementInfo.id = element.id;
      if (element.className) {
        elementInfo.class = element.className;
      }
    } else if (element instanceof HTMLSelectElement) {
      elementInfo.type = 'select';
      elementInfo.name = element.name;
      elementInfo.id = element.id;
      if (element.className) {
        elementInfo.class = element.className;
      }
    }

    return elementInfo;
  }

  /**
   * 检查元素是否可见
   */
  private isVisible(style: CSSStyleDeclaration, rect: DOMRect): boolean {
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /**
   * 检查元素是否可点击
   */
  private isClickable(element: Element, style: CSSStyleDeclaration): boolean {
    const clickableTags = ['a', 'button', 'input', 'select', 'textarea'];
    const clickableRoles = ['button', 'link', 'menuitem', 'option'];

    return (
      clickableTags.includes(element.tagName.toLowerCase()) ||
      clickableRoles.includes(element.getAttribute('role') || '') ||
      style.cursor === 'pointer' ||
      element.getAttribute('onclick') !== null ||
      element.hasAttribute('data-click')
    );
  }

  /**
   * 生成CSS选择器
   */
  private generateSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(cls => cls.trim());
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }

    // 使用标签和属性组合
    let selector = element.tagName.toLowerCase();

    if (element.hasAttribute('name')) {
      selector += `[name="${element.getAttribute('name')}"]`;
    } else if (element.hasAttribute('data-testid')) {
      selector += `[data-testid="${element.getAttribute('data-testid')}"]`;
    } else if (element.textContent) {
      const text = element.textContent.trim().substring(0, 20);
      selector += `[text="${text}"]`;
    }

    return selector;
  }

  /**
   * 生成XPath
   */
  private generateXPath(element: Element): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const path: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();

      if (current.id) {
        selector += `[@id="${current.id}"]`;
        path.unshift(selector);
        break;
      } else {
        let sibling = current;
        let nth = 1;

        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling;
          if (sibling.nodeName.toLowerCase() === selector) {
            nth++;
          }
        }

        if (nth > 1) {
          selector += `[${nth}]`;
        }

        path.unshift(selector);
        current = current.parentElement;
      }
    }

    return `/${path.join('/')}`;
  }

  /**
   * 获取元素属性
   */
  private getElementAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};

    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }

    return attributes;
  }

  /**
   * 分类元素
   */
  private categorizeElement(element: Element, elementInfo: PageElement, analysis: PageAnalysis): void {
    // 链接
    if (element instanceof HTMLAnchorElement) {
      analysis.links.push({
        selector: elementInfo.selector,
        text: elementInfo.text,
        href: element.href,
        target: element.target
      });
    }

    // 按钮
    if (element instanceof HTMLButtonElement ||
        (element.tagName.toLowerCase() === 'button') ||
        (element.tagName.toLowerCase() === 'input' && ['button', 'submit', 'reset'].includes((element as HTMLInputElement).type))) {
      analysis.buttons.push({
        selector: elementInfo.selector,
        text: elementInfo.text,
        type: (element as HTMLInputElement).type,
        disabled: (element as HTMLButtonElement).disabled,
        form: (element as HTMLButtonElement).form?.id
      });
    }

    // 输入框
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      analysis.inputs.push({
        selector: elementInfo.selector,
        type: (element as HTMLInputElement).type || 'text',
        name: (element as HTMLInputElement).name,
        placeholder: (element as HTMLInputElement).placeholder,
        value: (element as HTMLInputElement).value,
        required: (element as HTMLInputElement).required,
        maxLength: (element as HTMLInputElement).maxLength
      });
    }

    // 表单
    if (element instanceof HTMLFormElement) {
      const formFields: FieldInfo[] = [];
      const inputs = element.querySelectorAll('input, textarea, select');

      inputs.forEach(input => {
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
          formFields.push({
            selector: this.generateSelector(input),
            type: (input as HTMLInputElement).type || input.tagName.toLowerCase(),
            name: (input as HTMLInputElement).name,
            placeholder: (input as HTMLInputElement).placeholder,
            required: (input as HTMLInputElement).required,
            options: input instanceof HTMLSelectElement ?
              Array.from(input.options).map(opt => opt.text) : undefined
          });
        }
      });

      analysis.forms.push({
        selector: elementInfo.selector,
        action: element.action,
        method: element.method,
        fields: formFields
      });
    }

    // 标题
    if (/^h[1-6]$/i.test(element.tagName)) {
      analysis.content.headings.push({
        level: parseInt(element.tagName.substring(1)),
        text: elementInfo.text,
        selector: elementInfo.selector
      });
    }

    // 段落
    if (element.tagName.toLowerCase() === 'p' && elementInfo.text.length > 10) {
      analysis.content.paragraphs.push(elementInfo.text);
    }

    // 列表
    if (element.tagName.toLowerCase() === 'ul' || element.tagName.toLowerCase() === 'ol') {
      const items = Array.from(element.querySelectorAll('li')).map(li => li.textContent?.trim() || '');
      analysis.content.lists.push({
        type: element.tagName.toLowerCase() as 'ul' | 'ol',
        items,
        selector: elementInfo.selector
      });
    }

    // 表格
    if (element.tagName.toLowerCase() === 'table') {
      const headers = Array.from(element.querySelectorAll('thead th')).map(th => th.textContent?.trim() || '');
      const rows = Array.from(element.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
      );

      analysis.content.tables.push({
        headers,
        rows,
        selector: elementInfo.selector
      });
    }

    // 图片
    if (element instanceof HTMLImageElement) {
      analysis.content.images.push({
        src: element.src,
        alt: element.alt,
        title: element.title,
        selector: elementInfo.selector
      });
    }
  }

  /**
   * 创建空的分析结果
   */
  private createEmptyAnalysis(): PageAnalysis {
    return {
      url: '',
      title: '',
      elements: [],
      forms: [],
      links: [],
      buttons: [],
      inputs: [],
      navigation: [],
      content: {
        headings: [],
        paragraphs: [],
        lists: [],
        tables: [],
        images: []
      }
    };
  }

  /**
   * 分析浏览器任务
   */
  async analyzeBrowserTasks(
    prompt: string,
    pageAnalysis?: PageAnalysis
  ): Promise<BrowserTaskTemplate[]> {
    const identifiedTasks: BrowserTaskTemplate[] = [];
    const promptLower = prompt.toLowerCase();

    // 如果没有页面分析，尝试获取
    if (!pageAnalysis) {
      pageAnalysis = await this.analyzePage();
    }

    // 遍历所有浏览器操作模板
    for (const template of this.browserTemplates.values()) {
      let matchScore = 0;

      // 关键词匹配
      for (const keyword of template.keywords) {
        if (promptLower.includes(keyword.toLowerCase())) {
          matchScore += keyword.length;
        }
      }

      // 特殊模式匹配
      matchScore += this.calculateSpecialMatchScore(template, prompt, pageAnalysis);

      // 如果匹配分数超过阈值，添加到识别的任务中
      if (matchScore >= 2) {
        identifiedTasks.push({
          ...template,
          metadata: { matchScore }
        });
      }
    }

    // 按匹配分数排序
    identifiedTasks.sort((a, b) =>
      (b.metadata?.matchScore || 0) - (a.metadata?.matchScore || 0)
    );

    return identifiedTasks.slice(0, 10); // 最多返回10个任务
  }

  /**
   * 计算特殊匹配分数
   */
  private calculateSpecialMatchScore(
    template: BrowserTaskTemplate,
    prompt: string,
    pageAnalysis: PageAnalysis
  ): number {
    let score = 0;

    switch (template.actionType) {
      case 'click':
        if (/button|link|按钮|链接/.test(prompt)) score += 3;
        if (pageAnalysis.buttons.length > 0 && /submit|登录|确认/.test(prompt)) score += 2;
        break;

      case 'type':
        if (/input|inputbox|输入框|表单/.test(prompt)) score += 3;
        if (pageAnalysis.inputs.length > 0 && /填写|输入/.test(prompt)) score += 2;
        break;

      case 'navigate':
        if (/url|网址|链接|http|www/.test(prompt)) score += 5;
        if (/打开|访问|前往/.test(prompt)) score += 2;
        break;

      case 'extract':
        if (/数据|信息|内容|提取/.test(prompt)) score += 3;
        if (pageAnalysis.content.headings.length > 0 && /标题|章节/.test(prompt)) score += 2;
        if (pageAnalysis.links.length > 0 && /链接|地址/.test(prompt)) score += 2;
        break;

      case 'scroll':
        if (/scroll|滚动|向下滑|向上滑/.test(prompt)) score += 4;
        break;

      case 'screenshot':
        if (/截图|拍照|截屏/.test(prompt)) score += 5;
        break;
    }

    return score;
  }

  /**
   * 提取元素选择器
   */
  extractElementSelector(prompt: string, pageAnalysis?: PageAnalysis): string {
    // 首先尝试从提示词中提取直接选择器
    const selectorMatch = prompt.match(/selector[：:]\s*([^,\s]+)/i) ||
                         prompt.match(/选择器[：:]\s*([^,\s]+)/i) ||
                         prompt.match(/([#\.][a-zA-Z][\w-]*)/);

    if (selectorMatch) {
      return selectorMatch[1];
    }

    // 如果有页面分析，尝试基于内容匹配
    if (pageAnalysis) {
      return this.findSelectorByContent(prompt, pageAnalysis);
    }

    // 基于关键词的默认选择器
    if (/登录|login|signin/.test(prompt.toLowerCase())) {
      return 'button[type="submit"], .login-btn, #login';
    }
    if (/搜索|search/.test(prompt.toLowerCase())) {
      return 'input[type="search"], .search-input, #search';
    }
    if (/菜单|menu/.test(prompt.toLowerCase())) {
      return '.menu, .nav, .navigation';
    }

    return 'body'; // 默认选择器
  }

  /**
   * 基于内容查找选择器
   */
  private findSelectorByContent(prompt: string, pageAnalysis: PageAnalysis): string {
    const promptLower = prompt.toLowerCase();

    // 查找按钮
    for (const button of pageAnalysis.buttons) {
      if (button.text && promptLower.includes(button.text.toLowerCase())) {
        return button.selector;
      }
    }

    // 查找链接
    for (const link of pageAnalysis.links) {
      if (link.text && promptLower.includes(link.text.toLowerCase())) {
        return link.selector;
      }
    }

    // 查找输入框
    for (const input of pageAnalysis.inputs) {
      if (input.placeholder && promptLower.includes(input.placeholder.toLowerCase())) {
        return input.selector;
      }
      if (input.name && promptLower.includes(input.name.toLowerCase())) {
        return input.selector;
      }
    }

    return 'body';
  }

  /**
   * 提取输入值
   */
  extractInputValue(prompt: string): string {
    const valueMatch = prompt.match(/["""]([^""""]+)["""]/) ||
                      prompt.match(/输入[：:]?\s*([^\n，,。.]+)/i) ||
                      prompt.match(/填写[：:]?\s*([^\n，,。.]+)/i) ||
                      prompt.match(/内容[：:]?\s*([^\n，,。.]+)/i);

    return valueMatch ? valueMatch[1].trim() : '';
  }

  /**
   * 提取滚动方向
   */
  extractScrollDirection(prompt: string): string {
    if (/下|down|bottom/.test(prompt.toLowerCase())) {
      return 'down';
    }
    if (/上|up|top/.test(prompt.toLowerCase())) {
      return 'up';
    }
    return 'down';
  }

  /**
   * 提取等待时间
   */
  extractWaitDuration(prompt: string): number {
    const timeMatch = prompt.match(/(\d+)\s*(秒|second|s)/i) ||
                     prompt.match(/(\d+)\s*(毫秒|millisecond|ms)/i);

    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      return unit.includes('毫秒') || unit.includes('ms') ? value : value * 1000;
    }

    return 1000; // 默认1秒
  }

  /**
   * 提取导航URL
   */
  extractNavigationUrl(prompt: string): string {
    const urlMatch = prompt.match(/https?:\/\/[^\s]+/i) ||
                    prompt.match(/www\.[^\s]+/i);

    if (urlMatch) {
      return urlMatch[0];
    }

    // 如果没有完整的URL，可能是一个域名
    const domainMatch = prompt.match(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (domainMatch) {
      return `https://${domainMatch[1]}`;
    }

    return '';
  }

  /**
   * 提取提取选项
   */
  extractExtractionOptions(prompt: string): any {
    const options: any = {
      includeMeta: /元数据|meta/.test(prompt),
      includeLinks: /链接|link/.test(prompt),
      includeImages: /图片|image/.test(prompt),
      includeForms: /表单|form/.test(prompt)
    };

    // 提取特定选择器
    const selectors: Record<string, string> = {};
    const selectorMatches = prompt.matchAll(/(\w+)[：:]\s*([^,\n]+)/g);
    for (const match of selectorMatches) {
      selectors[match[1]] = match[2].trim();
    }

    if (Object.keys(selectors).length > 0) {
      options.selectors = selectors;
    }

    return options;
  }
}
