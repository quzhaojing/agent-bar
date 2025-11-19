import { llmClient } from './utils/llmClient';
import { storageManager } from './utils/storage';
import type {
  Message,
  APIRequest,
  LLMResponse,
  ToolbarConfig,
  ToolbarExportData,
  TemplateConfig,
  AgentBarConfig
} from './types';

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener(async (message: Message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'GET_CONFIG':
        const config = await storageManager.getConfig();
        sendResponse({ success: true, data: config });
        break;

      case 'UPDATE_CONFIG':
        await storageManager.setConfig(message.payload);
        sendResponse({ success: true });
        break;

      case 'GET_STORAGE':
        const { key } = message.payload;
        const value = await chrome.storage.local.get([key]);
        sendResponse({ success: true, data: value[key] });
        break;

      case 'SET_STORAGE':
        const { setKey, setValue } = message.payload;
        await chrome.storage.local.set({ [setKey]: setValue });
        sendResponse({ success: true });
        break;

      case 'API_REQUEST':
        const apiRequest = message.payload as APIRequest;
        const apiResponse = await llmClient.makeRequest(apiRequest);

        // Save to history if successful
        if (apiResponse.success && apiResponse.data) {
          const llmResponse: LLMResponse = {
            id: `response-${Date.now()}`,
            content: apiResponse.data,
            provider: apiRequest.provider.name,
            model: apiRequest.provider.model,
            prompt: apiRequest.prompt.replace('{{selectedText}}', apiRequest.selectedText),
            timestamp: Date.now(),
            usage: apiResponse.usage,
          };
          await storageManager.addToHistory(llmResponse);
        }

        sendResponse(apiResponse);
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Background script error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Agent Bar installed');

    // Detect browser language for translation
    const browserLanguage = chrome.i18n.getUILanguage();
    const targetLanguage = getLanguageName(browserLanguage) || 'English';

    try {
      // Load template configurations
      const templateToolbars = await loadTemplateToolbars(targetLanguage);

      await storageManager.setConfig({
        llmProviders: [],
        toolbarButtons: templateToolbars,
        settings: {
          theme: 'light',
          autoHide: true,
          showOnSelect: true,
          debounceDelay: 300,
          maxHistory: 50,
        }
      });
    } catch (error) {
      console.error('Error initializing configuration:', error);
    }
  } else if (details.reason === 'update') {
    console.log('Agent Bar updated');
  }
});

// Load template toolbars from embedded template data
async function loadTemplateToolbars(targetLanguage: string): Promise<any[]> {
  const templates = [
    {
      "name": "通用文本处理",
      "description": "适用于日常文本处理的基本工具按钮",
      "category": "general",
      "buttons": [
        {
          "id": "explain",
          "name": "解释",
          "icon": "🤔",
          "promptTemplate": "请用简单易懂的语言解释以下内容：{{selectedText}}",
          "order": 1,
          "enabled": true
        },
        {
          "id": "summarize",
          "name": "总结",
          "icon": "📝",
          "promptTemplate": "请将以下内容总结为要点：{{selectedText}}",
          "order": 2,
          "enabled": true
        },
        {
          "id": "translate",
          "name": "翻译",
          "icon": "🌐",
          "promptTemplate": "请将以下内容翻译成中文：{{selectedText}}",
          "order": 3,
          "enabled": true
        },
        {
          "id": "simplify",
          "name": "简化",
          "icon": "✨",
          "promptTemplate": "请将以下内容简化，使其更容易理解：{{selectedText}}",
          "order": 4,
          "enabled": true
        },
        {
          "id": "expand",
          "name": "扩展",
          "icon": "📖",
          "promptTemplate": "请对以下内容进行详细的扩展和说明：{{selectedText}}",
          "order": 5,
          "enabled": true
        }
      ],
      "urlRules": ["*"],
      "tags": ["text", "general", "daily"]
    },
    {
      "name": "编程开发",
      "description": "适用于程序员和代码开发的工具按钮",
      "category": "development",
      "buttons": [
        {
          "id": "explain-code",
          "name": "解释代码",
          "icon": "💻",
          "promptTemplate": "请解释以下代码的功能和工作原理：{{selectedText}}",
          "order": 1,
          "enabled": true
        },
        {
          "id": "optimize-code",
          "name": "优化代码",
          "icon": "⚡",
          "promptTemplate": "请优化以下代码，提高性能和可读性：{{selectedText}}",
          "order": 2,
          "enabled": true
        },
        {
          "id": "debug-code",
          "name": "调试代码",
          "icon": "🐛",
          "promptTemplate": "请分析以下代码中可能存在的错误和问题：{{selectedText}}",
          "order": 3,
          "enabled": true
        },
        {
          "id": "refactor-code",
          "name": "重构代码",
          "icon": "🔄",
          "promptTemplate": "请重构以下代码，使其更加模块化和可维护：{{selectedText}}",
          "order": 4,
          "enabled": true
        },
        {
          "id": "add-comments",
          "name": "添加注释",
          "icon": "💬",
          "promptTemplate": "请为以下代码添加详细的注释和文档：{{selectedText}}",
          "order": 5,
          "enabled": true
        },
        {
          "id": "convert-language",
          "name": "转换语言",
          "icon": "🔀",
          "promptTemplate": "请将以下代码转换成Python语言：{{selectedText}}",
          "order": 6,
          "enabled": true
        },
        {
          "id": "generate-tests",
          "name": "生成测试",
          "icon": "🧪",
          "promptTemplate": "请为以下代码生成单元测试：{{selectedText}}",
          "order": 7,
          "enabled": true
        }
      ],
      "urlRules": ["github.com", "stackoverflow.com", "gitlab.com", "bitbucket.org"],
      "tags": ["code", "development", "programming", "debug"]
    },
    {
      "name": "写作助手",
      "description": "适用于写作和内容创作的工具按钮",
      "category": "writing",
      "buttons": [
        {
          "id": "improve-writing",
          "name": "改进写作",
          "icon": "✍️",
          "promptTemplate": "请改进以下文本的语法、词汇和表达，使其更加专业和流畅：{{selectedText}}",
          "order": 1,
          "enabled": true
        },
        {
          "id": "check-grammar",
          "name": "检查语法",
          "icon": "📝",
          "promptTemplate": "请检查以下文本的语法错误并提供修改建议：{{selectedText}}",
          "order": 2,
          "enabled": true
        },
        {
          "id": "change-tone",
          "name": "改变语气",
          "icon": "🎭",
          "promptTemplate": "请将以下文本的语气改为更加正式和专业：{{selectedText}}",
          "order": 3,
          "enabled": true
        },
        {
          "id": "make-concise",
          "name": "精简文本",
          "icon": "🎯",
          "promptTemplate": "请将以下文本精简，保留核心信息，去除冗余内容：{{selectedText}}",
          "order": 4,
          "enabled": true
        },
        {
          "id": "expand-content",
          "name": "扩展内容",
          "icon": "📚",
          "promptTemplate": "请对以下内容进行详细扩展，增加更多细节和例子：{{selectedText}}",
          "order": 5,
          "enabled": true
        },
        {
          "id": "rewrite-style",
          "name": "重写风格",
          "icon": "🎨",
          "promptTemplate": "请用更加生动和有趣的方式重新表达以下内容：{{selectedText}}",
          "order": 6,
          "enabled": true
        }
      ],
      "urlRules": ["notion.so", "docs.google.com", "medium.com", "wordpress.org", "substack.com"],
      "tags": ["writing", "content", "creative", "grammar"]
    },
    {
      "name": "学习研究",
      "description": "适用于学习和学术研究的工具按钮",
      "category": "education",
      "buttons": [
        {
          "id": "explain-concept",
          "name": "解释概念",
          "icon": "🧠",
          "promptTemplate": "请详细解释以下概念，包括定义、原理和应用：{{selectedText}}",
          "order": 1,
          "enabled": true
        },
        {
          "id": "find-examples",
          "name": "举例说明",
          "icon": "💡",
          "promptTemplate": "请为以下概念提供具体的例子和应用场景：{{selectedText}}",
          "order": 2,
          "enabled": true
        },
        {
          "id": "create-outline",
          "name": "创建大纲",
          "icon": "📋",
          "promptTemplate": "请基于以下内容创建一个详细的学习大纲：{{selectedText}}",
          "order": 3,
          "enabled": true
        },
        {
          "id": "generate-quiz",
          "name": "生成测验",
          "icon": "❓",
          "promptTemplate": "请基于以下内容生成一些练习题和测验：{{selectedText}}",
          "order": 4,
          "enabled": true
        },
        {
          "id": "compare-concepts",
          "name": "概念对比",
          "icon": "⚖️",
          "promptTemplate": "请分析以下概念的相同点和不同点：{{selectedText}}",
          "order": 5,
          "enabled": true
        },
        {
          "id": "historical-context",
          "name": "历史背景",
          "icon": "📜",
          "promptTemplate": "请提供以下概念的历史背景和发展过程：{{selectedText}}",
          "order": 6,
          "enabled": true
        }
      ],
      "urlRules": ["wikipedia.org", "coursera.org", "edx.org", "khanacademy.org", "youtube.com"],
      "tags": ["learning", "education", "study", "research", "academic"]
    },
    {
      "name": "商务办公",
      "description": "适用于商务和办公场景的工具按钮",
      "category": "business",
      "buttons": [
        {
          "id": "write-email",
          "name": "撰写邮件",
          "icon": "📧",
          "promptTemplate": "请基于以下要点撰写一封专业的商务邮件：{{selectedText}}",
          "order": 1,
          "enabled": true
        },
        {
          "id": "create-summary",
          "name": "创建摘要",
          "icon": "📊",
          "promptTemplate": "请将以下内容创建成一份简洁的商务摘要：{{selectedText}}",
          "order": 2,
          "enabled": true
        },
        {
          "id": "generate-report",
          "name": "生成报告",
          "icon": "📈",
          "promptTemplate": "请将以下数据和信息整理成一份结构化的报告：{{selectedText}}",
          "order": 3,
          "enabled": true
        },
        {
          "id": "brainstorm-ideas",
          "name": "头脑风暴",
          "icon": "🚀",
          "promptTemplate": "请基于以下主题进行头脑风暴，提供创新的想法和建议：{{selectedText}}",
          "order": 4,
          "enabled": true
        },
        {
          "id": "swot-analysis",
          "name": "SWOT分析",
          "icon": "🔍",
          "promptTemplate": "请对以下内容进行SWOT分析（优势、劣势、机会、威胁）：{{selectedText}}",
          "order": 5,
          "enabled": true
        },
        {
          "id": "create-proposal",
          "name": "创建提案",
          "icon": "📝",
          "promptTemplate": "请基于以下信息创建一份商务提案：{{selectedText}}",
          "order": 6,
          "enabled": true
        }
      ],
      "urlRules": ["linkedin.com", "slack.com", "microsoft.com", "google.com", "notion.so"],
      "tags": ["business", "office", "professional", "corporate", "work"]
    }
  ];

  const toolbars: any[] = [];

  for (const template of templates) {
    try {
      const toolbar = convertTemplateToToolbar(template, targetLanguage);
      if (toolbar) {
        toolbars.push(toolbar);
      }
    } catch (error) {
      console.error(`Error processing template ${template.name}:`, error);
    }
  }

  return toolbars;
}

// Convert template format to toolbar format
function convertTemplateToToolbar(template: any, targetLanguage: string): any {
  if (!template || !template.buttons || !Array.isArray(template.buttons)) {
    return null;
  }

  // Convert URL rules to website patterns
  const websitePatterns = template.urlRules && Array.isArray(template.urlRules)
    ? template.urlRules.map((rule: string) => ({
        pattern: rule.includes('*') ? rule : `*.${rule}`,
        enabled: true
      }))
    : [{ pattern: '*', enabled: true }];

  // Convert buttons to the expected format
  const buttons = template.buttons.map((button: any, index: number) => ({
    id: button.id || `btn-${index + 1}`,
    title: button.name || button.id || 'Button',
    prompt: button.promptTemplate || 'Process this: {{selectedText}}',
    enabled: button.enabled !== false
  }));

  // For translate button, customize the prompt to use browser language
  const translateButton = buttons.find((btn: any) =>
    btn.title.toLowerCase().includes('translate') ||
    btn.title.toLowerCase().includes('翻译')
  );

  if (translateButton && translateButton.prompt.includes('中文')) {
    translateButton.prompt = `Translate this to ${targetLanguage}: {{selectedText}}`;
  }

  return {
    id: `toolbar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: template.name || 'Template Toolbar',
    websitePatterns,
    context: template.description || '',
    buttons,
    enabled: true
  };
}

// Helper function to get language name from language code
function getLanguageName(languageCode: string): string {
  const languageMap: { [key: string]: string } = {
    'en': 'English',
    'en-US': 'English',
    'en-GB': 'English',
    'zh': 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'es': 'Spanish',
    'es-ES': 'Spanish',
    'es-MX': 'Spanish',
    'fr': 'French',
    'fr-FR': 'French',
    'de': 'German',
    'de-DE': 'German',
    'ja': 'Japanese',
    'ja-JP': 'Japanese',
    'ko': 'Korean',
    'ko-KR': 'Korean',
    'pt': 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    'pt-PT': 'Portuguese (Portugal)',
    'ru': 'Russian',
    'ru-RU': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'it': 'Italian',
    'it-IT': 'Italian',
    'nl': 'Dutch',
    'nl-NL': 'Dutch',
    'sv': 'Swedish',
    'sv-SE': 'Swedish',
    'da': 'Danish',
    'da-DK': 'Danish',
    'no': 'Norwegian',
    'nn-NO': 'Norwegian',
    'fi': 'Finnish',
    'fi-FI': 'Finnish',
    'pl': 'Polish',
    'pl-PL': 'Polish',
    'tr': 'Turkish',
    'tr-TR': 'Turkish',
    'th': 'Thai',
    'th-TH': 'Thai',
    'vi': 'Vietnamese',
    'vi-VN': 'Vietnamese',
    'id': 'Indonesian',
    'id-ID': 'Indonesian',
    'ms': 'Malay',
    'ms-MY': 'Malay',
    'tl': 'Filipino',
    'tl-PH': 'Filipino',
    'he': 'Hebrew',
    'he-IL': 'Hebrew',
    'cs': 'Czech',
    'cs-CZ': 'Czech',
    'hu': 'Hungarian',
    'hu-HU': 'Hungarian',
    'ro': 'Romanian',
    'ro-RO': 'Romanian',
    'bg': 'Bulgarian',
    'bg-BG': 'Bulgarian',
    'hr': 'Croatian',
    'hr-HR': 'Croatian',
    'sr': 'Serbian',
    'sr-RS': 'Serbian',
    'sk': 'Slovak',
    'sk-SK': 'Slovak',
    'sl': 'Slovenian',
    'sl-SI': 'Slovenian',
    'et': 'Estonian',
    'et-EE': 'Estonian',
    'lv': 'Latvian',
    'lv-LV': 'Latvian',
    'lt': 'Lithuanian',
    'lt-LT': 'Lithuanian',
    'uk': 'Ukrainian',
    'uk-UA': 'Ukrainian',
    'el': 'Greek',
    'el-GR': 'Greek',
    'is': 'Icelandic',
    'is-IS': 'Icelandic',
    'mt': 'Maltese',
    'mt-MT': 'Maltese',
    'cy': 'Welsh',
    'cy-GB': 'Welsh',
    'ga': 'Irish',
    'ga-IE': 'Irish',
    'gd': 'Scottish Gaelic',
    'gd-GB': 'Scottish Gaelic',
    'eu': 'Basque',
    'eu-ES': 'Basque',
    'ca': 'Catalan',
    'ca-ES': 'Catalan',
    'gl': 'Galician',
    'gl-ES': 'Galician',
    'ast': 'Asturian',
    'ast-ES': 'Asturian',
  };

  // Normalize language code
  const normalizedCode = languageCode.split('-')[0];

  // Try exact match first
  if (languageMap[languageCode]) {
    return languageMap[languageCode];
  }

  // Try normalized match
  if (languageMap[normalizedCode]) {
    return languageMap[normalizedCode];
  }

  // Default to English if not found
  return 'English';
}

// Handle storage changes and notify content scripts
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local' && changes['agent-bar-config']) {
    // Notify all tabs about configuration changes
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'CONFIG_CHANGED',
              payload: changes['agent-bar-config'].newValue,
            });
          } catch (error) {
            // Ignore errors for tabs that don't have content script
          }
        }
      }
    } catch (error) {
      console.error('Error notifying tabs of config changes:', error);
    }
  }
});

// Handle tab updates to clear cache
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Clear URL matching cache when tab is updated
    try {
      // This will be used by the content script to invalidate cache
      await chrome.tabs.sendMessage(tabId, {
        type: 'URL_CHANGED',
        payload: { url: tab.url },
      });
    } catch (error) {
      // Ignore errors for tabs that don't have content script
    }
  }
});

export {};