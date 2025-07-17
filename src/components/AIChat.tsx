import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageCircle, Sparkles, Copy, Check } from 'lucide-react';
import { cn } from '../utils';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response (in real implementation, this would call your AI API)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I understand you're looking for help with your code. While I'm currently in development mode, I'm designed to provide intelligent code assistance. In the full version, I'll be able to:\n\n• Explain code functionality\n• Debug issues\n• Suggest improvements\n• Generate code snippets\n• Refactor existing code\n• Answer programming questions\n\nFor now, you can use me to discuss your coding needs and I'll provide helpful responses once the AI backend is connected!",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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

  return (
    <div className={cn("bg-editor-sidebar border-l border-editor-border flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-editor-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-editor-accent" />
          <h2 className="text-lg font-semibold text-editor-text">AI Assistant</h2>
        </div>
        <p className="text-sm text-editor-text-secondary mt-1">
          Your coding companion
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto editor-scrollbar p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 animate-fade-in",
              message.type === 'user' ? 'flex-row-reverse' : ''
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              message.type === 'user' 
                ? "bg-editor-accent text-white" 
                : "bg-editor-tab text-editor-text"
            )}>
              {message.type === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            <div className={cn(
              "flex-1 min-w-0",
              message.type === 'user' ? 'flex justify-end' : ''
            )}>
              <div className={cn(
                "rounded-lg p-3 max-w-[80%] group relative",
                message.type === 'user'
                  ? "bg-editor-accent text-white"
                  : "bg-editor-tab text-editor-text"
              )}>
                <div className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                  <span>{formatTime(message.timestamp)}</span>
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-editor-border"
                    title="Copy message"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-editor-tab text-editor-text flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-editor-tab text-editor-text rounded-lg p-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-editor-text-secondary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-editor-text-secondary rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-editor-text-secondary rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        )}

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