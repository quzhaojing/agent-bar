import { SystemMessage, HumanMessage, type BaseMessage, isAIMessage } from "@langchain/core/messages"
import type { LLMProvider } from "~/types"
import { createChatModel } from "./modelFactory"
import { browserTools } from "./browserTools"
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search"

type Step = { name: string; input: any; output?: any; error?: string }
export type BrowserAgentResult = { status: "ok" | "error"; data?: any; steps: Step[]; model: { provider: string; model: string } }

const webSearchTool = new DuckDuckGoSearch({ maxResults: 3 })

function bindTools(model: any) {
  const tools = [...Object.values(browserTools), webSearchTool]
  return model.bindTools(tools)
}

async function callLlm(modelWithTools: any, messages: BaseMessage[]) {
  return modelWithTools.invoke([
    new SystemMessage(
      "You are a web assistant. You can use built-in browser tools to interact with pages. When the task is pure text processing (e.g., translation, rewriting, summarization, explanation), do not call any tools — respond in plain text. Only call tools when page interaction is required. Do not use rigid JSON output; keep natural plain-text responses. If tools were used, provide a brief conclusion in the final answer."
    ),
    ...messages
  ])
}

async function callTool(toolCall: any) {
  const toolMap: Record<string, any> = { ...(browserTools as any), [(webSearchTool as any).name]: webSearchTool }
  const t = toolMap[toolCall.name]
  if (!t) throw new Error(`Tool not found: ${toolCall.name}`)
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
      const normalized = typeof parsed === "string" ? { text: parsed } : parsed
      const status = (typeof normalized === "object" && (normalized as any).status) || "ok"
      const data = (typeof normalized === "object" && (normalized as any).data) ? (normalized as any).data : normalized
      return { status, data, steps, model: { provider: provider.type, model: provider.model } }
    } catch {
      const data = { text: last.text }
      dbg("final-text", data)
      return { status: "ok", data: data, steps, model: { provider: provider.type, model: provider.model } }
    }
  }
  dbg("final-error")
  return { status: "error", steps, model: { provider: provider.type, model: provider.model } }
}
