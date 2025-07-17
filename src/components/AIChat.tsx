import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check } from 'lucide-react';
import { cn } from '../utils';
import { useSettings } from '../contexts/SettingsContext';
import { createOllamaService } from '../services/ollamaService';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  className?: string;
}

const AIChat: React.FC<AIChatProps> = ({ className }) => {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI coding assistant. I can help you with code explanations, debugging, refactoring, and writing new code. What would you like to work on?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setAiError(null);

    try {
      // Get the active AI model
      const activeModel = settings.ai.models.find(m => m.isEnabled);
      if (!activeModel) {
        throw new Error('No AI model configured. Please check your settings.');
      }

      // Create AI service
      const aiService = createOllamaService(activeModel);

      // Check AI health first
      const healthCheck = await aiService.healthCheck();
      if (!healthCheck.healthy) {
        throw new Error(`AI service not available: ${healthCheck.error}`);
      }

      // Generate AI response
      const systemPrompt = `You are an expert AI coding assistant integrated into a VS Code-like editor. 

You can help with:
1. Code analysis and explanations
2. Debugging and error fixing
3. Code refactoring and optimization
4. Writing new code and functions
5. Best practices and design patterns
6. Language-specific guidance
7. Project structure recommendations

Provide clear, actionable responses. When suggesting code, use proper syntax highlighting and explain your reasoning.`;

      const response = await aiService.generateResponse(
        input,
        systemPrompt,
        activeModel.temperature,
        activeModel.maxTokens
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get AI response';
      setAiError(errorMessage);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `Sorry, I encountered an error: ${errorMessage}\n\nPlease check your AI model configuration in settings.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting for code blocks
    const formattedContent = content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="bg-editor-tab border border-editor-border rounded p-3 my-2 overflow-x-auto"><code class="text-sm">${code}</code></pre>`;
      })
      .replace(/`([^`]+)`/g, '<code class="bg-editor-tab px-1 rounded text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    return { __html: formattedContent };
  };

  return (
    <div className={cn("flex flex-col h-full bg-editor-bg", className)}>
      {/* Header */}
      <div className="p-4 border-b border-editor-border">
        <h3 className="text-sm font-medium text-editor-text">AI Chat Assistant</h3>
        {aiError && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
            {aiError}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto editor-scrollbar">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.type === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {message.type === 'ai' && (
                <div className="w-6 h-6 bg-editor-accent rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-white font-medium">AI</span>
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-3",
                  message.type === 'user'
                    ? "bg-editor-accent text-white"
                    : "bg-editor-tab text-editor-text"
                )}
              >
                <div 
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={formatMessageContent(message.content)}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs opacity-60">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.type === 'ai' && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-6 h-6 bg-editor-accent rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-white font-medium">U</span>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-6 h-6 bg-editor-accent rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-white font-medium">AI</span>
              </div>
              <div className="bg-editor-tab rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-editor-accent rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-editor-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-editor-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-editor-text-secondary">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-editor-border">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your code..."
            className="flex-1 bg-editor-tab border border-editor-border rounded-lg px-3 py-2 text-sm text-editor-text placeholder-editor-text-secondary resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:border-editor-accent transition-colors"
            rows={1}
            style={{ resize: 'none' }}
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={cn(
              "px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
              input.trim() && !isTyping
                ? "bg-editor-accent hover:bg-editor-accent-hover text-white"
                : "bg-editor-tab text-editor-text-secondary cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-editor-text-secondary">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default AIChat; 