export interface AgentMessage {
  id: string;
  agentId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent: string; // Keep for backward compatibility
  agent: string; // Agent type: 'planner', 'verifier', 'implementer'
  thinking?: string; // The agent's thinking process
  actions: AgentAction[]; // Actions taken by the agent
  results: AgentWorkflowResult[]; // Results produced by the agent
  result?: any; // Keep for backward compatibility
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  dependencies?: string[];
}

export interface AgentWorkflow {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tasks: AgentTask[];
  results: AgentWorkflowResult[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentWorkflowResult {
  id: string;
  type: 'file_created' | 'file_modified' | 'file_deleted' | 'command_executed' | 'package_installed' | 'search_performed' | 'analysis_completed';
  title: string;
  description: string;
  data: any;
  agentId: string;
  taskId: string;
  timestamp: Date;
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  permissions: string[];
}

export interface AgentContext {
  workflowId: string;
  taskId: string;
  fileSystemItems: any[];
  openFiles: any[];
  activeFile?: any;
  terminalHistory: any[];
  projectStructure?: any;
  dependencies?: any[];
  environment?: Record<string, string>;
}

export interface AgentResponse {
  success: boolean;
  content: string;
  thinking?: string;
  actions?: AgentAction[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentAction {
  id: string;
  type: 'create_file' | 'modify_file' | 'delete_file' | 'execute_command' | 'install_package' | 'search_web' | 'analyze_code';
  title: string;
  description: string;
  parameters: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface AgentExecutionState {
  currentWorkflow?: AgentWorkflow;
  activeAgents: string[];
  executionQueue: AgentTask[];
  completedTasks: AgentTask[];
  failedTasks: AgentTask[];
  isExecuting: boolean;
  lastError?: string;
}

export interface AIModelResponse {
  content: string;
  thinking?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: 'stop' | 'length' | 'error';
} 