import type { LLMProvider } from "~/types"
import { ChatOpenAI } from "@langchain/openai"
import { ChatAnthropic } from "@langchain/anthropic"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

export function createChatModel(provider: LLMProvider) {
  const temperature = provider.temperature ?? 0
  const model = provider.model
  if (provider.type === "openai") {
    return new ChatOpenAI({ apiKey: provider.apiKey, model, temperature })
  }
  if (provider.type === "claude") {
    return new ChatAnthropic({ apiKey: provider.apiKey, model, temperature })
  }
  if (provider.type === "gemini") {
    return new ChatGoogleGenerativeAI({ apiKey: provider.apiKey, model, temperature })
  }
  return new ChatOpenAI({ apiKey: provider.apiKey, model, temperature }, { baseURL: provider.baseUrl })
}
