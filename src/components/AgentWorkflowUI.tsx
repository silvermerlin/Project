import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Copy, 
  Check,
  Zap,
  FileText,
  Code,
  Terminal,
  Settings
} from 'lucide-react';
import { cn } from '../utils';
import { useSettings } from '../contexts/SettingsContext';
import { AgentOrchestrator } from '../services/agentOrchestrator';
import { createOllamaService } from '../services/ollamaService';

interface AgentWorkflowUIProps {
  className?: string;
}

interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent: string;
  result?: any;
  thinking?: string;
  actions?: any[];
}

interface AgentWorkflow {
  id: string;
  status: 'idle' | 'in_progress' | 'completed' | 'failed';
  tasks: AgentTask[];
  createdAt: Date;
  completedAt?: Date;
}

const AgentWorkflowUI: React.FC<AgentWorkflowUIProps> = ({ className }) => {
  const { settings } = useSettings();
  const [workflow, setWorkflow] = useState<AgentWorkflow | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; message: string; timestamp: Date }>>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [copiedContent, setCopiedContent] = useState<string | null>(null);
  const [orchestrator, setOrchestrator] = useState<AgentOrchestrator | null>(null);

  useEffect(() => {
    // Initialize orchestrator when settings change
    if (settings.ai.models.length > 0 && settings.ai.agents.length > 0) {
      const activeModels = settings.ai.models.filter(m => m.isEnabled);
      const activeAgents = settings.ai.agents.filter(a => a.isEnabled);
      
      if (activeModels.length > 0 && activeAgents.length > 0) {
        const newOrchestrator = new AgentOrchestrator(activeModels, activeAgents);
        setOrchestrator(newOrchestrator);
      }
    }
  }, [settings]);

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

  const handleSendRequest = async () => {
    if (!userInput.trim() || isExecuting || !orchestrator) return;

    // Add user message to chat history
    setChatHistory(prev => [...prev, {
      id: `user-${Date.now()}`,
      message: userInput.trim(),
      timestamp: new Date()
    }]);

    const request = userInput.trim();
    setUserInput('');
    setIsExecuting(true);

    try {
      // Create new workflow
      const newWorkflow: AgentWorkflow = {
        id: `workflow-${Date.now()}`,
        status: 'in_progress',
        tasks: [],
        createdAt: new Date()
      };
      setWorkflow(newWorkflow);

      // Execute workflow with orchestrator
      const result = await orchestrator.executeWorkflow(request, {
        workspace: '/workspace',
        files: [], // TODO: Add current workspace files
        terminalHistory: [], // TODO: Add terminal history
        currentFile: null // TODO: Add current file
      });

      // Update workflow with results
      setWorkflow(prev => prev ? {
        ...prev,
        status: result.success ? 'completed' : 'failed',
        tasks: result.tasks || [],
        completedAt: new Date()
      } : null);

      // Add AI response to chat history
      if (result.success && result.finalResponse) {
        setChatHistory(prev => [...prev, {
          id: `ai-${Date.now()}`,
          message: result.finalResponse,
          timestamp: new Date()
        }]);
      }

    } catch (error) {
      console.error('Workflow execution error:', error);
      setWorkflow(prev => prev ? {
        ...prev,
        status: 'failed',
        completedAt: new Date()
      } : null);

      // Add error message to chat history
      setChatHistory(prev => [...prev, {
        id: `error-${Date.now()}`,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendRequest();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'planner':
        return <FileText className="w-4 h-4" />;
      case 'implementer':
        return <Code className="w-4 h-4" />;
      case 'verifier':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn("flex flex-col h-full bg-editor-bg", className)}>
      {/* Header */}
      <div className="p-4 border-b border-editor-border">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-editor-accent" />
          <h3 className="text-lg font-semibold text-editor-text">Agent Workflow</h3>
        </div>
        <p className="text-sm text-editor-text-secondary">
          AI agents collaborate to help you build and improve your code
        </p>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto editor-scrollbar">
        <div className="p-4 space-y-4">
          {chatHistory.map((message) => (
            <div key={message.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  message.id.startsWith('user') 
                    ? "bg-editor-accent text-white" 
                    : "bg-editor-tab text-editor-text"
                )}>
                  {message.id.startsWith('user') ? 'U' : 'AI'}
                </div>
                <span className="text-xs text-editor-text-secondary">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <div className="ml-8 bg-editor-tab rounded-lg p-3">
                <div className="text-sm text-editor-text whitespace-pre-wrap">
                  {message.message}
                </div>
              </div>
            </div>
          ))}

          {/* Workflow Status */}
          {workflow && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-editor-text">Workflow Progress</h4>
                {getStatusIcon(workflow.status)}
              </div>
              
              <div className="space-y-2">
                {workflow.tasks.map((task) => (
                  <div key={task.id} className="bg-editor-tab border border-editor-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getAgentIcon(task.assignedAgent)}
                        <span className="text-sm font-medium text-editor-text">
                          {task.title}
                        </span>
                        {getStatusIcon(task.status)}
                      </div>
                      <button
                        onClick={() => toggleTaskExpansion(task.id)}
                        className="text-xs text-editor-text-secondary hover:text-editor-text"
                      >
                        {expandedTasks.has(task.id) ? 'Hide' : 'Show'} Details
                      </button>
                    </div>
                    
                    {expandedTasks.has(task.id) && (
                      <div className="mt-3 space-y-3">
                        <div className="text-xs text-editor-text-secondary">
                          {task.description}
                        </div>
                        
                        {task.thinking && (
                          <div className="bg-editor-bg rounded p-2">
                            <div className="text-xs text-editor-text-secondary mb-1">Thinking Process:</div>
                            <div className="text-xs text-editor-text whitespace-pre-wrap">
                              {task.thinking}
                            </div>
                            <button
                              onClick={() => copyToClipboard(task.thinking, `thinking-${task.id}`)}
                              className="mt-1 text-xs text-editor-accent hover:text-editor-accent-hover"
                            >
                              {copiedContent === `thinking-${task.id}` ? (
                                <Check className="w-3 h-3 inline" />
                              ) : (
                                <Copy className="w-3 h-3 inline" />
                              )}
                              Copy
                            </button>
                          </div>
                        )}
                        
                        {task.actions && task.actions.length > 0 && (
                          <div className="bg-editor-bg rounded p-2">
                            <div className="text-xs text-editor-text-secondary mb-1">Actions:</div>
                            <div className="space-y-1">
                              {task.actions.map((action, index) => (
                                <div key={index} className="text-xs text-editor-text">
                                  • {action.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-editor-border">
        <div className="flex gap-2 mb-2">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build or improve..."
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
        
        <div className="mt-2 text-xs text-editor-text-secondary">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default AgentWorkflowUI; 