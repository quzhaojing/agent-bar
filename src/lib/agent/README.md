# 浏览器插件 Agent 使用示例

- 该模块基于 LangChain 的 LangGraph Functional API，实现可调用浏览器工具的智能 Agent。
- 输出为结构化结果，包含 `status`、`data`、`steps` 与 `model`。

## 基本用法

```ts
import { executeBrowserAgent } from "~/lib/agent"
import type { LLMProvider } from "~/types"

const provider: LLMProvider = {
  id: "p-openai",
  name: "OpenAI",
  type: "openai",
  apiKey: "YOUR_OPENAI_API_KEY",
  model: "gpt-4o-mini",
  enabled: true
}

const prompt = "打开 https://example.com 并截取页面截图，返回截图的 dataUrl"

const result = await executeBrowserAgent(prompt, provider)

console.log(result.status)
console.log(result.model)
console.log(result.steps)
console.log(result.data)
```

## 结构化结果示例

```json
{
  "status": "ok",
  "data": {
    "text": "已完成页面截图",
    "dataUrl": "data:image/png;base64,iVBORw0..."
  },
  "steps": [
    {
      "name": "browser_navigate",
      "input": { "url": "https://example.com", "waitForLoad": true },
      "output": { "ok": true, "result": { "url": "https://example.com/" } }
    },
    {
      "name": "browser_take_screenshot",
      "input": { "area": "viewport", "format": "png" },
      "output": { "ok": true, "result": { "dataUrl": "data:image/png;base64,iVBORw0..." } }
    }
  ],
  "model": { "provider": "openai", "model": "gpt-4o-mini" }
}
```

## 切换到其他模型

```ts
import { executeBrowserAgent } from "~/lib/agent"
import type { LLMProvider } from "~/types"

const claude: LLMProvider = {
  id: "p-claude",
  name: "Claude",
  type: "claude",
  apiKey: "YOUR_ANTHROPIC_API_KEY",
  model: "claude-3-5-sonnet-latest",
  enabled: true
}

const gemini: LLMProvider = {
  id: "p-gemini",
  name: "Gemini",
  type: "gemini",
  apiKey: "YOUR_GEMINI_API_KEY",
  model: "gemini-1.5-pro",
  enabled: true
}

const deepseek: LLMProvider = {
  id: "p-deepseek",
  name: "DeepSeek",
  type: "deepseek",
  apiKey: "YOUR_API_KEY",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  enabled: true
}

await executeBrowserAgent("在 GitHub 搜索 LangChain 并滚动到搜索结果", claude)
await executeBrowserAgent("打开 google.com 并截图", gemini)
await executeBrowserAgent("访问 example.com 并提取页面所有链接", deepseek)
```

## 内置浏览器工具

- `browser_navigate`：导航并可选等待加载完成
- `browser_click_element`：按选择器点击元素，支持双击、右键与等待元素出现
- `browser_type_text`：向输入框填充文本，可选清空与回车
- `browser_wait_for_element`：等待元素状态 `visible/hidden/present/absent`
- `browser_scroll_page`：页面或元素滚动，支持平滑滚动
- `browser_take_screenshot`：捕获可见区域截图，返回 `dataUrl`
- `browser_extract_content`：提取 `text/links/images/tables/forms/all`，结构化返回
- `browser_select_dropdown`：按值、文本或索引选择下拉项
- `browser_refresh_page`：刷新并可选等待加载完成
- `browser_tab_management`：新开、关闭、切换或在当前标签打开 URL

## 运行环境要求

- 在 Chrome 扩展上下文调用，需在 `manifest` 中启用 `activeTab` 与 `scripting` 权限。
- 工具通过 `chrome.tabs` 与 `chrome.scripting` 注入执行，默认作用于当前活动标签。
