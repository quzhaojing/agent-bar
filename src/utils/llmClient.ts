import type { LLMProvider, APIRequest, APIResponse } from '../types';

class LLMClient {
  private async makeRequest(url: string, headers: Record<string, string>, body: any): Promise<Response> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  private async handleStreamResponse(response: Response, onChunk: (chunk: string) => void): Promise<string> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return fullText;
            }

            try {
              const parsed = JSON.parse(data);
              const content = this.extractContent(parsed);
              if (content) {
                fullText += content;
                onChunk(content);
              }
            } catch (e) {
              // Ignore JSON parse errors for malformed chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }

  private extractContent(data: any): string {
    // OpenAI format
    if (data.choices?.[0]?.delta?.content) {
      return data.choices[0].delta.content;
    }
    if (data.choices?.[0]?.text) {
      return data.choices[0].text;
    }

    // Claude format
    if (data.content?.[0]?.text) {
      return data.content[0].text;
    }
    if (data.delta?.text) {
      return data.delta.text;
    }

    // Gemini format
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    return '';
  }

  // OpenAI API handler
  private async handleOpenAI(request: APIRequest): Promise<APIResponse> {
    const { provider, prompt, selectedText } = request;
    const finalPrompt = prompt.replace('{{selectedText}}', selectedText);

    const headers = {
      'Authorization': `Bearer ${provider.apiKey}`,
    };

    const body = {
      model: provider.model,
      messages: [
        {
          role: 'user',
          content: finalPrompt,
        },
      ],
      temperature: provider.temperature || 0.7,
      max_tokens: provider.maxTokens || 1000,
      stream: false,
    };

    try {
      const response = await this.makeRequest(
        `${provider.baseUrl || 'https://api.openai.com/v1'}/chat/completions`,
        headers,
        body
      );

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in response');
      }

      return {
        success: true,
        data: content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Claude API handler
  private async handleClaude(request: APIRequest): Promise<APIResponse> {
    const { provider, prompt, selectedText } = request;
    const finalPrompt = prompt.replace('{{selectedText}}', selectedText);

    const headers = {
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    };

    const body = {
      model: provider.model,
      messages: [
        {
          role: 'user',
          content: finalPrompt,
        },
      ],
      max_tokens: provider.maxTokens || 1000,
      temperature: provider.temperature || 0.7,
    };

    try {
      const response = await this.makeRequest(
        `${provider.baseUrl || 'https://api.anthropic.com/v1'}/messages`,
        headers,
        body
      );

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error('No content in response');
      }

      return {
        success: true,
        data: content,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        } : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Gemini API handler
  private async handleGemini(request: APIRequest): Promise<APIResponse> {
    const { provider, prompt, selectedText } = request;
    const finalPrompt = prompt.replace('{{selectedText}}', selectedText);

    const headers = {
      'x-goog-api-key': provider.apiKey,
    };

    const body = {
      contents: [
        {
          parts: [
            {
              text: finalPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: provider.temperature || 0.7,
        maxOutputTokens: provider.maxTokens || 1000,
      },
    };

    try {
      const response = await this.makeRequest(
        `${provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'}/models/${provider.model}:generateContent`,
        headers,
        body
      );

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('No content in response');
      }

      return {
        success: true,
        data: content,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        } : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Generic API handler for OpenAI-compatible APIs (DeepSeek, Qwen, GLM, etc.)
  private async handleGeneric(request: APIRequest): Promise<APIResponse> {
    const { provider, prompt, selectedText } = request;
    const finalPrompt = prompt.replace('{{selectedText}}', selectedText);

    const headers = {
      'Authorization': `Bearer ${provider.apiKey}`,
    };

    const body = {
      model: provider.model,
      messages: [
        {
          role: 'user',
          content: finalPrompt,
        },
      ],
      temperature: provider.temperature || 0.7,
      max_tokens: provider.maxTokens || 1000,
      stream: false,
    };

    try {
      if (!provider.baseUrl) {
        throw new Error('Base URL is required for this provider');
      }

      const response = await this.makeRequest(`${provider.baseUrl}/chat/completions`, headers, body);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in response');
      }

      return {
        success: true,
        data: content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Main request handler
  async makeRequest(request: APIRequest): Promise<APIResponse> {
    const { provider } = request;

    if (!provider.apiKey) {
      return {
        success: false,
        error: 'API key is required',
      };
    }

    switch (provider.type) {
      case 'openai':
        return this.handleOpenAI(request);
      case 'claude':
        return this.handleClaude(request);
      case 'gemini':
        return this.handleGemini(request);
      case 'deepseek':
      case 'qwen':
      case 'glm':
      default:
        return this.handleGeneric(request);
    }
  }

  // Validate provider configuration
  validateProvider(provider: LLMProvider): { valid: boolean; error?: string } {
    if (!provider.name) {
      return { valid: false, error: 'Provider name is required' };
    }

    if (!provider.apiKey) {
      return { valid: false, error: 'API key is required' };
    }

    if (!provider.model) {
      return { valid: false, error: 'Model is required' };
    }

    if (provider.type === 'gemini' || provider.type === 'deepseek' || provider.type === 'qwen' || provider.type === 'glm') {
      if (!provider.baseUrl) {
        return { valid: false, error: 'Base URL is required for this provider type' };
      }
    }

    return { valid: true };
  }

  // Test provider connection
  async testProvider(provider: LLMProvider): Promise<APIResponse> {
    const testRequest: APIRequest = {
      provider,
      prompt: 'Hello, please respond with "Connection successful"',
      selectedText: '',
    };

    return this.makeRequest(testRequest);
  }
}

export const llmClient = new LLMClient();