import { AIModelConfig } from '../types/settings';
import { AIModelResponse } from '../types/agent';

export class OllamaService {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: AIModelConfig) {
    // Always use backend proxy to avoid CORS issues
    this.baseUrl = '/api/ollama';
    console.log('Using Ollama proxy through backend:', this.baseUrl);
    this.model = config.model;
    this.timeout = 300000; // 5 minutes for large context LLM responses
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      console.log('Checking Ollama health at:', `${this.baseUrl}/api/tags`);
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        // Keep shorter timeout for health check
        signal: AbortSignal.timeout(10000), // 10 second timeout for health check
      });
      
      if (!response.ok) {
        return { 
          healthy: false, 
          error: `HTTP ${response.status}: ${await response.text().catch(() => 'Unknown error')}` 
        };
      }
      
      const data = await response.json();
      console.log('Ollama health check successful:', data);
      
      // Check if the model exists
      const modelExists = data.models?.some((m: any) => m.name === this.model);
      if (!modelExists) {
        return { 
          healthy: false, 
          error: `Model "${this.model}" not found. Available models: ${data.models?.map((m: any) => m.name).join(', ') || 'none'}` 
        };
      }
      
      return { healthy: true };
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async generateResponse(
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<AIModelResponse> {
    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      console.log('Ollama request:', {
        url: `${this.baseUrl}/api/chat`,
        model: this.model,
        messages: messages,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 4096
      });

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          options: {
            temperature: temperature || 0.7,
            num_predict: maxTokens || 4096,
          },
          stream: false,
        }),
        // Remove timeout to avoid AbortSignal issues with long LLM responses
        // signal: AbortSignal.timeout(this.timeout),
      });

      console.log('Ollama response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('Ollama API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const data = await response.json();
      
      return {
        content: data.message?.content || '',
        thinking: this.extractThinking(data.message?.content || ''),
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        model: this.model,
        finishReason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Failed to get response from Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStreamResponse(
    prompt: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number,
    onChunk?: (chunk: string) => void
  ): Promise<AIModelResponse> {
    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          options: {
            temperature: temperature || 0.7,
            num_predict: maxTokens || 4096,
          },
          stream: true,
        }),
        // Remove timeout to avoid AbortSignal issues with long LLM responses
        // signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullContent = '';
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      let finishReason: 'stop' | 'length' | 'error' = 'stop';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              if (data.message?.content) {
                fullContent += data.message.content;
                onChunk?.(data.message.content);
              }

              if (data.prompt_eval_count) {
                usage.promptTokens = data.prompt_eval_count;
              }
              
              if (data.eval_count) {
                usage.completionTokens = data.eval_count;
              }
              
              if (data.done) {
                usage.totalTokens = usage.promptTokens + usage.completionTokens;
                finishReason = 'stop';
                break;
              }
            } catch (parseError) {
              console.warn('Failed to parse chunk:', parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        content: fullContent,
        thinking: this.extractThinking(fullContent),
        usage,
        model: this.model,
        finishReason,
      };
    } catch (error) {
      console.error('Ollama streaming error:', error);
      throw new Error(`Failed to get streaming response from Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  async pullModel(modelName: string, onProgress?: (progress: string) => void): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              if (data.status) {
                onProgress?.(data.status);
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse pull progress:', parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return true;
    } catch (error) {
      console.error('Failed to pull model:', error);
      return false;
    }
  }

  private extractThinking(content: string): string | undefined {
    // Extract thinking patterns from the response
    const thinkingPatterns = [
      /```thinking\n([\s\S]*?)```/g,
      /\*\*Thinking:\*\*\n([\s\S]*?)(?=\n\*\*|$)/g,
      /\*thinking\*([\s\S]*?)\*\/thinking\*/g,
      /Let me think about this:\n([\s\S]*?)(?=\n\n|$)/g,
    ];

    for (const pattern of thinkingPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace(pattern, '$1').trim();
      }
    }

    return undefined;
  }
}

export const createOllamaService = (config: AIModelConfig): OllamaService => {
  return new OllamaService(config);
}; 