/**
 * Agent Library Utilities
 *
 * 这个文件包含了一些实用的工具函数
 */

import type { AgentTask, AgentLLMProvider,  AgentContext } from './types';

export class AgentUtils {
  static deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== undefined) {
        if (this.isObject(source[key]) && this.isObject(result[key])) {
          result[key] = this.deepMerge(result[key], source[key] as any);
        } else {
          result[key] = source[key] as any;
        }
      }
    }
    return result;
  }

  static isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  static generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  static formatTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(2)}s`;
    } else {
      return `${(milliseconds / 60000).toFixed(2)}min`;
    }
  }

  static validateLLMProvider(provider: AgentLLMProvider): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!provider.name) {
      errors.push('提供商名称是必需的');
    }
    if (!provider.apiKey) {
      errors.push('API密钥是必需的');
    }
    if (!provider.model) {
      errors.push('模型名称是必需的');
    }
    if (!provider.type) {
      errors.push('提供商类型是必需的');
    }

    const validTypes = ['openai', 'claude', 'gemini', 'deepseek', 'qwen', 'glm'];
    if (provider.type && !validTypes.includes(provider.type)) {
      errors.push(`不支持的提供商类型: ${provider.type}`);
    }

    if (provider.type === 'gemini' || provider.type === 'deepseek' || provider.type === 'qwen' || provider.type === 'glm') {
      if (!provider.baseUrl) {
        errors.push(`${provider.type} 类型需要提供基础URL`);
      } else {
        try {
          new URL(provider.baseUrl);
        } catch {
          errors.push('基础URL格式不正确');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static createContext(): AgentContext {
    const context: AgentContext = {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };

    if (typeof window !== 'undefined') {
      context.currentUrl = window.location.href;
      context.pageTitle = document.title;

      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        context.selectedText = selection.toString().trim();
      }
    }

    return context;
  }

  static truncateText(text: string, maxLength: number = 500): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  static estimateTokens(text: string): number {
    const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherCharCount = text.length - chineseCharCount;
    return Math.ceil(chineseCharCount / 1.5 + otherCharCount / 4);
  }

  static cloneConfig<T>(config: T): T {
    return JSON.parse(JSON.stringify(config));
  }

  static safeParseJSON<T>(jsonString: string, fallback: T): T {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  }

  static delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  static withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError?: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(timeoutError || `操作超时 (${timeoutMs}ms)`));
        }, timeoutMs);
      })
    ]);
  }

  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxAttempts) {
          throw lastError;
        }

        await this.delay(delayMs * Math.pow(backoffMultiplier, attempt - 1));
      }
    }

    throw lastError!;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static matchesTask(task: AgentTask, searchTerm: string): boolean {
    const term = searchTerm.toLowerCase();
    return (
      task.name.toLowerCase().includes(term) ||
      task.description.toLowerCase().includes(term) ||
      (task.category && task.category.toLowerCase().includes(term)) ||
      task.id.toLowerCase().includes(term)
    );
  }

  static filterTasks(tasks: AgentTask[], filters: {
    category?: string;
    enabled?: boolean;
    search?: string;
  }): AgentTask[] {
    return tasks.filter(task => {
      if (filters.category && task.category !== filters.category) {
        return false;
      }
      if (filters.enabled !== undefined && task.enabled !== filters.enabled) {
        return false;
      }
      if (filters.search && !this.matchesTask(task, filters.search)) {
        return false;
      }
      return true;
    });
  }

  static validateTask(task: AgentTask): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!task.id) {
      errors.push('任务ID是必需的');
    }
    if (!task.name) {
      errors.push('任务名称是必需的');
    }
    if (!task.description) {
      errors.push('任务描述是必需的');
    }
    if (!task.promptTemplate) {
      errors.push('提示词模板是必需的');
    }
    if (!Array.isArray(task.parameters)) {
      errors.push('参数配置必须是数组');
    } else {
      task.parameters.forEach((param, index) => {
        if (!param.name) {
          errors.push(`参数${index + 1}缺少名称`);
        }
        if (!param.type) {
          errors.push(`参数${index + 1}缺少类型`);
        }
        if (typeof param.required !== 'boolean') {
          errors.push(`参数${index + 1}的required字段必须是布尔值`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
