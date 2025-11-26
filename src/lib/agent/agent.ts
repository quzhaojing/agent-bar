import { SystemMessage, HumanMessage, type BaseMessage, isAIMessage } from "@langchain/core/messages"
import type { LLMProvider } from "~/types"
import { createChatModel } from "./modelFactory"
import { browserTools } from "./browserTools"

type Step = { name: string; input: any; output?: any; error?: string }
export type BrowserAgentResult = { status: "ok" | "error"; data?: any; steps: Step[]; model: { provider: string; model: string } }

function bindTools(model: any) {
  const tools = Object.values(browserTools)
  return model.bindTools(tools)
}

async function callLlm(modelWithTools: any, messages: BaseMessage[]) {
  return modelWithTools.invoke([
    new SystemMessage(
      "你是网页智能助手。你可以使用内置浏览器工具执行页面操作；当任务是纯文本处理（如翻译、改写、总结、解释等）时，请不要调用任何工具，直接以纯文本回答。仅在确需页面交互时调用工具。不要使用固定JSON格式输出，保持自然的纯文本回答；如果进行了工具操作，请在最终回答中简要给出结论。"
    ),
    ...messages
  ])
}

async function callTool(toolCall: any) {
  const t = (browserTools as any)[toolCall.name]
  return t.invoke(toolCall)
}

export async function executeBrowserAgent(prompt: string, provider: LLMProvider, options?: { debug?: boolean }): Promise<BrowserAgentResult> {
  const dbg = options?.debug ? (...args: any[]) => console.log("[BrowserAgent]", ...args) : (..._args: any[]) => {}
  dbg("init", { provider: provider.type, model: provider.model })
  const model = createChatModel(provider)
  const modelWithTools = bindTools(model)
  dbg("tools-bound", { count: Object.values(browserTools).length })
  let messages: BaseMessage[] = [new HumanMessage(prompt)]
  dbg("llm-start", { messages: messages.length })
  let modelResponse = await callLlm(modelWithTools, messages)
  dbg("llm-response", { hasToolCalls: !!(modelResponse as any).tool_calls, toolCalls: (modelResponse as any).tool_calls?.length || 0 })
  let stepCount = 0
  let lastCallSig = ""
  while (true) {
    const calls = (modelResponse as any).tool_calls
    if (!calls || !calls.length) break
    if (stepCount >= 20) break
    const sig = JSON.stringify(calls.map((c: any) => ({ n: c.name, a: c.args })))
    if (sig === lastCallSig) break
    dbg("tool-calls", calls.map((c: any) => ({ name: c.name, args: c.args })))
    const toolResults = await Promise.all(calls.map((c: any) => callTool(c)))
    dbg("tool-results", toolResults)
    messages.push(modelResponse as any, ...toolResults as any)
    dbg("messages-updated", { messages: messages.length })
    if (messages.length > 40) {
      const base = messages.slice(0, 2)
      const tail = messages.slice(-10)
      messages = [...base, ...tail]
    }
    stepCount++
    lastCallSig = sig
    modelResponse = await callLlm(modelWithTools, messages)
    dbg("llm-response", { hasToolCalls: !!(modelResponse as any).tool_calls, toolCalls: (modelResponse as any).tool_calls?.length || 0 })
  }
  dbg("agent-finish")
  const result = [...messages, modelResponse as any]
  dbg("agent-invoke-done", { messages: result.length })
  const steps: Step[] = []
  for (const m of result) {
    const t = m.getType()
    if (t === "tool") {
      const name = (m as any).name || "tool"
      const input = (m as any).input
      const output = (m as any).output
      const error = output && output.ok === false ? output.error : undefined
      steps.push({ name, input, output, error })
      dbg("step", { name, error, ok: !error })
    }
  }
  const last = result[result.length - 1]
  dbg("final-message-type", last?.getType?.())
  if (isAIMessage(last)) {
    try {
      const parsed = JSON.parse(last.text || "{}")
      dbg("final-json", parsed)
      return { status: parsed.status || "ok", data: parsed.data, steps, model: { provider: provider.type, model: provider.model } }
    } catch {
      const data = { text: last.text }
      dbg("final-text", data)
      return { status: "ok", data, steps, model: { provider: provider.type, model: provider.model } }
    }
  }
  dbg("final-error")
  return { status: "error", steps, model: { provider: provider.type, model: provider.model } }
}
