import React, { useState } from 'react';
import { 
  Bot, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  Pause, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Terminal,
  Search,
  Package,
  Code,
  Zap,
  Copy,
  Check,
  Send
} from 'lucide-react';
import { AgentWorkflow, AgentTask, AgentAction, AgentWorkflowResult } from '../types/agent';
import { cn } from '../utils';

interface AgentWorkflowUIProps {
  workflow: AgentWorkflow | null;
  isExecuting: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  onSendRequest?: (request: string) => void;
  className?: string;
}

const AgentWorkflowUI: React.FC<AgentWorkflowUIProps> = ({
  workflow,
  isExecuting,
  onCancel,
  onRetry,
  onSendRequest,
  className,
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [copiedContent, setCopiedContent] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; message: string; timestamp: Date }>>([]);

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedContent(id);
      setTimeout(() => setCopiedContent(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSendRequest = () => {
    if (userInput.trim() && onSendRequest && !isExecuting) {
      // Add user message to chat history
      setChatHistory(prev => [...prev, {
        id: `user-${Date.now()}`,
        message: userInput.trim(),
        timestamp: new Date()
      }]);
      
      onSendRequest(userInput.trim());
      setUserInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendRequest();
    }
  };

  const getStatusIcon = (status: 'pending' | 'in_progress' | 'completed' | 'failed') => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-editor-text-secondary" />;
      case 'in_progress':
        return <div className="w-4 h-4 border-2 border-editor-accent border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_file':
      case 'modify_file':
      case 'delete_file':
        return <FileText className="w-4 h-4" />;
      case 'execute_command':
        return <Terminal className="w-4 h-4" />;
      case 'search_web':
        return <Search className="w-4 h-4" />;
      case 'install_package':
        return <Package className="w-4 h-4" />;
      case 'analyze_code':
        return <Code className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'planner':
        return <Brain className="w-4 h-4" />;
      case 'verifier':
        return <CheckCircle className="w-4 h-4" />;
      case 'implementer':
        return <Code className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const getAgentColor = (type: string) => {
    switch (type) {
      case 'planner':
        return 'border-blue-500';
      case 'verifier':
        return 'border-green-500';
      case 'implementer':
        return 'border-purple-500';
      default:
        return 'border-editor-accent';
    }
  };

  return (
    <div className={cn("bg-editor-bg border-l border-editor-border flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-editor-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-editor-accent" />
            <h2 className="text-lg font-semibold text-editor-text">Agent Workflow</h2>
          </div>
          <div className="flex items-center gap-2">
            {workflow?.status === 'in_progress' && (
              <div className="flex items-center gap-1 text-editor-accent">
                <div className="w-2 h-2 bg-editor-accent rounded-full animate-pulse"></div>
                <span className="text-sm">Processing...</span>
              </div>
            )}
            {onCancel && isExecuting && (
              <button
                onClick={onCancel}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
            )}
            {onRetry && workflow?.status === 'failed' && (
              <button
                onClick={onRetry}
                className="px-3 py-1 text-sm bg-editor-accent hover:bg-editor-accent-hover text-white rounded transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
        
        {workflow && (
          <div className="mt-2">
            <h3 className="font-medium text-editor-text">{workflow.title}</h3>
            <p className="text-sm text-editor-text-secondary">{workflow.description}</p>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!workflow ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-12 h-12 text-editor-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-editor-text mb-2">AI Agents Ready to Help</h3>
              <p className="text-editor-text-secondary">
                Type your request in the chat below and watch the agents collaborate
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {workflow.tasks.map((task) => (
              <div key={task.id} className="bg-editor-tab rounded-lg border border-editor-border">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center", getAgentColor(task.agent))}>
                        {getAgentIcon(task.agent)}
                      </div>
                      <div>
                        <h4 className="font-medium text-editor-text">{task.title}</h4>
                        <p className="text-sm text-editor-text-secondary">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <button
                        onClick={() => toggleTaskExpansion(task.id)}
                        className="text-editor-text-secondary hover:text-editor-text transition-colors"
                      >
                        {expandedTasks.has(task.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expandedTasks.has(task.id) && (
                    <div className="mt-4 space-y-3 bg-editor-bg border border-editor-border rounded p-3">
                      {task.thinking && (
                        <div className="bg-editor-tab p-3 rounded border border-editor-border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-editor-text">💭 Thinking Process</h5>
                            <button
                              onClick={() => copyToClipboard(task.thinking || '', `thinking-${task.id}`)}
                              className="text-editor-text-secondary hover:text-editor-text transition-colors"
                            >
                              {copiedContent === `thinking-${task.id}` ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <div className="text-sm text-editor-text bg-editor-bg p-2 rounded border border-editor-border max-h-40 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">{task.thinking}</pre>
                          </div>
                        </div>
                      )}

                      {!task.thinking && (
                        <div className="bg-editor-tab p-3 rounded border border-editor-border">
                          <div className="text-sm text-editor-text-secondary">
                            💭 No thinking process recorded for this task
                          </div>
                        </div>
                      )}

                      {task.actions.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-editor-text">Actions</h5>
                          {task.actions.map((action) => (
                            <div key={action.id} className="flex items-center gap-2 p-2 bg-editor-bg rounded border border-editor-border">
                              {getActionIcon(action.type)}
                              <span className="text-sm text-editor-text flex-1">{action.description}</span>
                              {getStatusIcon(action.status)}
                            </div>
                          ))}
                        </div>
                      )}

                      {task.results.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-editor-text">Results</h5>
                          {task.results.map((result) => (
                            <div key={result.id} className="p-2 bg-editor-bg rounded border border-editor-border">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getActionIcon(result.type)}
                                  <span className="text-sm font-medium text-editor-text">
                                    {result.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => copyToClipboard(result.content || result.description, `result-${result.id}`)}
                                    className="text-editor-text-secondary hover:text-editor-text transition-colors"
                                  >
                                    {copiedContent === `result-${result.id}` ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                  <span className="text-xs text-editor-text-secondary">
                                    {result.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                              {result.content && (
                                <pre className="text-xs text-editor-text-secondary mt-2 whitespace-pre-wrap">
                                  {result.content}
                                </pre>
                              )}
                              {result.description && (
                                <p className="text-xs text-editor-text-secondary">
                                  {result.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div className="p-4 border-t border-editor-border bg-editor-background">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-editor-accent" />
            <h3 className="text-sm font-medium text-editor-text">Chat with AI Agents</h3>
          </div>
          <p className="text-xs text-editor-text-secondary">
            Describe what you want the agents to do, and they'll collaborate to help you.
          </p>
        </div>
        
        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="mb-3 max-h-40 overflow-y-auto space-y-2">
            {chatHistory.map((message) => (
              <div key={message.id} className="flex items-start gap-2 p-2 bg-editor-tab rounded-lg">
                <div className="w-6 h-6 rounded-full bg-editor-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-white font-medium">U</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-editor-text break-words">
                    {message.message}
                  </div>
                  <div className="text-xs text-editor-text-secondary mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 mb-2">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your request here... (e.g., 'Create a React component for a todo list')"
            className="flex-1 bg-editor-tab border border-editor-border rounded-lg px-3 py-2 text-sm text-editor-text placeholder-editor-text-secondary resize-none min-h-[60px] max-h-[120px] focus:outline-none focus:border-editor-accent transition-colors"
            rows={3}
            disabled={isExecuting}
          />
          <button
            onClick={handleSendRequest}
            disabled={!userInput.trim() || isExecuting}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors flex items-center gap-2 self-start font-medium",
              userInput.trim() && !isExecuting
                ? "bg-editor-accent hover:bg-editor-accent-hover text-white"
                : "bg-editor-tab text-editor-text-secondary cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
            {isExecuting ? 'Processing...' : 'Send'}
          </button>
        </div>
        
        {workflow && (
          <div className="flex items-center justify-between text-xs text-editor-text-secondary">
            <span>
              Status: {workflow.status === 'in_progress' ? 'Processing your request...' : workflow.status}
            </span>
            <span>
              {workflow.tasks.filter(t => t.status === 'completed').length} / {workflow.tasks.length} tasks completed
            </span>
          </div>
        )}
        
        <div className="mt-2 flex items-center justify-between text-xs text-editor-text-secondary">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {!workflow && (
            <span className="text-editor-accent">Ready to help!</span>
          )}
        </div>
        
        {/* Example prompts when no workflow is active */}
        {!workflow && !isExecuting && (
          <div className="mt-3 pt-2 border-t border-editor-border">
            <p className="text-xs text-editor-text-secondary mb-2">Try asking me to:</p>
            <div className="flex flex-wrap gap-1">
              {[
                "Create a React component",
                "Fix errors in my code",
                "Add a new feature",
                "Optimize performance",
                "Write unit tests"
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setUserInput(example)}
                  className="px-2 py-1 text-xs bg-editor-tab hover:bg-editor-accent-hover hover:text-white rounded border border-editor-border transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentWorkflowUI; 