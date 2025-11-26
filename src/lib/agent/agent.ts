import { SystemMessage, HumanMessage, type BaseMessage, isAIMessage } from "@langchain/core/messages"
import { task, entrypoint } from "@langchain/langgraph"
import { addMessages } from "@langchain/langgraph"
import type { LLMProvider } from "~/types"
import { createChatModel } from "./modelFactory"
import { browserTools } from "./browserTools"

type Step = { name: string; input: any; output?: any; error?: string }
export type BrowserAgentResult = { status: "ok" | "error"; data?: any; steps: Step[]; model: { provider: string; model: string } }

function bindTools(model: any) {
  const tools = Object.values(browserTools)
  return model.bindTools(tools)
}

const callLlm = task({ name: "callLlm" }, async (modelWithTools: any, messages: BaseMessage[]) => {
  return modelWithTools.invoke([new SystemMessage("你是浏览器自动化助手。根据用户目标决定是否调用工具执行页面操作。所有最终回答必须为JSON结构体，包含status、data与steps。"), ...messages])
})

const callTool = task({ name: "callTool" }, async (toolCall: any) => {
  const t = (browserTools as any)[toolCall.name]
  return t.invoke(toolCall)
})

export async function executeBrowserAgent(prompt: string, provider: LLMProvider, options?: { debug?: boolean }): Promise<BrowserAgentResult> {
  const dbg = options?.debug ? (...args: any[]) => console.log("[BrowserAgent]", ...args) : (..._args: any[]) => {}
  dbg("init", { provider: provider.type, model: provider.model })
  const model = createChatModel(provider)
  const modelWithTools = bindTools(model)
  dbg("tools-bound", { count: Object.values(browserTools).length })
  const agent = entrypoint({ name: "agent" }, async (messages: BaseMessage[]) => {
    dbg("llm-start", { messages: messages.length })
    let modelResponse = await callLlm(modelWithTools, messages)
    dbg("llm-response", { hasToolCalls: !!(modelResponse as any).tool_calls, toolCalls: (modelResponse as any).tool_calls?.length || 0 })
    while (true) {
      const calls = (modelResponse as any).tool_calls
      if (!calls || !calls.length) break
      dbg("tool-calls", calls.map((c: any) => ({ name: c.name, args: c.args })))
      const toolResults = await Promise.all(calls.map((c: any) => callTool(c)))
      dbg("tool-results", toolResults)
      messages = addMessages(messages, [modelResponse, ...toolResults])
      dbg("messages-updated", { messages: messages.length })
      modelResponse = await callLlm(modelWithTools, messages)
      dbg("llm-response", { hasToolCalls: !!(modelResponse as any).tool_calls, toolCalls: (modelResponse as any).tool_calls?.length || 0 })
    }
    dbg("agent-finish")
    return messages
  })
  const result = await agent.invoke([new HumanMessage(prompt)])
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
