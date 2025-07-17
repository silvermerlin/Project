import { 
  AgentWorkflow, 
  AgentTask, 
  AgentContext, 
  AgentResponse, 
  AgentAction, 
  AgentWorkflowResult,
  AgentExecutionState,
  AIModelResponse
} from '../types/agent';
import { AgentConfig, AIModelConfig } from '../types/settings';
import { createOllamaService } from './ollamaService';
import { webSearchService } from './webSearchService';
import { createNewFile, createNewFolder, FileItem } from '../utils/fileUtils';

export class AgentOrchestrator {
  private agents: Map<string, AgentConfig> = new Map();
  private models: Map<string, AIModelConfig> = new Map();
  private executionState: AgentExecutionState = {
    activeAgents: [],
    executionQueue: [],
    completedTasks: [],
    failedTasks: [],
    isExecuting: false,
  };

  constructor(
    agents: AgentConfig[],
    models: AIModelConfig[],
    private onWorkflowUpdate?: (workflow: AgentWorkflow) => void,
    private onTaskUpdate?: (task: AgentTask) => void,
    private onActionUpdate?: (action: AgentAction) => void,
    private terminalExecutor?: (command: string) => Promise<{ output: string; error?: string }>,
    private fileSystemCallbacks?: {
      createFile: (file: any) => void;
      modifyFile: (fileId: string, updates: any) => void;
      deleteFile: (fileId: string) => void;
    }
  ) {
    agents.forEach(agent => this.agents.set(agent.id, agent));
    models.forEach(model => this.models.set(model.id, model));
  }

  async startWorkflow(
    userRequest: string,
    context: Partial<AgentContext>
  ): Promise<AgentWorkflow> {
    const workflow: AgentWorkflow = {
      id: `workflow-${Date.now()}`,
      title: this.extractTitle(userRequest),
      description: userRequest,
      status: 'pending',
      tasks: [],
      results: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.executionState.currentWorkflow = workflow;
    this.executionState.isExecuting = true;

    try {
      // Health check before starting workflow
      const plannerAgent = Array.from(this.agents.values()).find(a => a.role === 'planner');
      if (plannerAgent) {
        const model = this.models.get(plannerAgent.aiModel);
        if (model) {
          const ollamaService = createOllamaService(model);
          const healthCheck = await ollamaService.healthCheck();
          console.log('Ollama health check result:', healthCheck);
          
          if (!healthCheck.healthy) {
            throw new Error(`Ollama service is not healthy: ${healthCheck.error}`);
          }
        }
      }

      // Step 1: Planning Phase
      const plannerTask = await this.createPlannerTask(userRequest, context);
      workflow.tasks.push(plannerTask);
      this.onTaskUpdate?.(plannerTask);

      const plan = await this.executeTask(plannerTask, context);
      if (!plan.success) {
        workflow.status = 'failed';
        return workflow;
      }

      // Step 2: Verification Phase
      const verifierTask = await this.createVerifierTask(plan.content, context);
      workflow.tasks.push(verifierTask);
      this.onTaskUpdate?.(verifierTask);

      const verification = await this.executeTask(verifierTask, context);
      if (!verification.success) {
        workflow.status = 'failed';
        return workflow;
      }

      // Step 3: Implementation Phase
      const implementerTask = await this.createImplementerTask(
        verification.content,
        context
      );
      workflow.tasks.push(implementerTask);
      this.onTaskUpdate?.(implementerTask);

      const implementation = await this.executeTask(implementerTask, context);
      
      // Execute actions from implementation
      if (implementation.actions) {
        const actionResults = await this.executeActions(implementation.actions, context);
        workflow.results.push(...actionResults);
      }

      workflow.status = implementation.success ? 'completed' : 'failed';
      workflow.updatedAt = new Date();
      
      this.onWorkflowUpdate?.(workflow);
      
      return workflow;
    } catch (error) {
      console.error('Workflow execution failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userRequest,
        context
      });
      workflow.status = 'failed';
      workflow.updatedAt = new Date();
      this.executionState.lastError = error instanceof Error ? error.message : 'Unknown error';
      return workflow;
    } finally {
      this.executionState.isExecuting = false;
    }
  }

  private async createPlannerTask(
    userRequest: string,
    context: Partial<AgentContext>
  ): Promise<AgentTask> {
    const plannerAgent = Array.from(this.agents.values()).find(a => a.role === 'planner');
    if (!plannerAgent) {
      throw new Error('No planner agent configured');
    }

    return {
      id: `task-${Date.now()}-planner`,
      title: 'Analyze and Plan',
      description: 'Analyze the user request and create a detailed implementation plan',
      status: 'pending',
      assignedAgent: plannerAgent.id,
      agent: 'planner',
      thinking: '',
      actions: [],
      results: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async createVerifierTask(
    plan: string,
    context: Partial<AgentContext>
  ): Promise<AgentTask> {
    const verifierAgent = Array.from(this.agents.values()).find(a => a.role === 'verifier');
    if (!verifierAgent) {
      throw new Error('No verifier agent configured');
    }

    return {
      id: `task-${Date.now()}-verifier`,
      title: 'Review and Verify',
      description: 'Review the implementation plan and verify its correctness',
      status: 'pending',
      assignedAgent: verifierAgent.id,
      agent: 'verifier',
      thinking: '',
      actions: [],
      results: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async createImplementerTask(
    verifiedPlan: string,
    context: Partial<AgentContext>
  ): Promise<AgentTask> {
    const implementerAgent = Array.from(this.agents.values()).find(a => a.role === 'implementer');
    if (!implementerAgent) {
      throw new Error('No implementer agent configured');
    }

    return {
      id: `task-${Date.now()}-implementer`,
      title: 'Implement Solution',
      description: 'Implement the verified plan and make necessary code changes',
      status: 'pending',
      assignedAgent: implementerAgent.id,
      agent: 'implementer',
      thinking: '',
      actions: [],
      results: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async executeTask(
    task: AgentTask,
    context: Partial<AgentContext>
  ): Promise<AgentResponse> {
    const agent = this.agents.get(task.assignedAgent);
    if (!agent) {
      throw new Error(`Agent ${task.assignedAgent} not found`);
    }

    const model = this.models.get(agent.aiModel);
    if (!model) {
      throw new Error(`Model ${agent.aiModel} not found`);
    }

    task.status = 'in_progress';
    this.onTaskUpdate?.(task);

    try {
      const contextPrompt = this.buildContextPrompt(context);
      
      // Add previous agent outputs to context for better coordination
      const previousWork = this.buildPreviousWorkContext(context);
      
      const fullPrompt = `${contextPrompt}\n\n${previousWork}\n\nTask: ${task.description}`;

      const aiService = createOllamaService(model);
      const response = await aiService.generateResponse(
        fullPrompt,
        agent.systemPrompt,
        model.temperature,
        model.maxTokens
      );

      const agentResponse: AgentResponse = {
        success: true,
        content: response.content,
        thinking: response.thinking,
        actions: this.extractActions(response.content),
        metadata: {
          usage: response.usage,
          model: response.model,
          finishReason: response.finishReason,
        },
      };

      task.status = 'completed';
      task.result = agentResponse;
      
      // Set thinking process - use the full response content as thinking
      task.thinking = response.content; // Show full response as thinking
      task.actions = agentResponse.actions || [];
      
      console.log('🧠 Task completed:', {
        taskId: task.id,
        title: task.title,
        thinkingLength: task.thinking.length,
        actionsCount: task.actions.length,
        actions: task.actions.map(a => `${a.type}: ${a.title}`)
      });
      
      // Execute actions and populate results
      for (const action of task.actions) {
        try {
          console.log('🚀 Executing action:', action.type, action.title);
          action.status = 'in_progress';
          this.onActionUpdate?.(action);
          
          const actionResult = await this.executeAction(action, context);
          action.status = 'completed';
          task.results.push(actionResult);
          
          console.log('✅ Action completed:', action.title, actionResult.title);
        } catch (error) {
          console.error('❌ Action execution failed:', error);
          action.status = 'failed';
          action.error = error instanceof Error ? error.message : 'Action failed';
          
          task.results.push({
            id: `result-${Date.now()}`,
            type: action.type,
            title: `${action.type} - Failed`,
            description: error instanceof Error ? error.message : 'Action failed',
            data: null,
            agentId: task.assignedAgent,
            taskId: task.id,
            timestamp: new Date(),
          });
        }
        this.onActionUpdate?.(action);
      }
      
      task.updatedAt = new Date();
      this.onTaskUpdate?.(task);

      return agentResponse;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.updatedAt = new Date();
      
      console.error(`Task execution failed:`, {
        taskId: task.id,
        taskTitle: task.title,
        agent: task.agent,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      this.onTaskUpdate?.(task);

      return {
        success: false,
        content: '',
        error: task.error,
      };
    }
  }

  private async executeActions(
    actions: AgentAction[],
    context: Partial<AgentContext>
  ): Promise<AgentWorkflowResult[]> {
    const results: AgentWorkflowResult[] = [];

    for (const action of actions) {
      action.status = 'in_progress';
      this.onActionUpdate?.(action);

      try {
        const result = await this.executeAction(action, context);
        
        action.status = 'completed';
        action.result = result;
        this.onActionUpdate?.(action);

        results.push(result);
      } catch (error) {
        action.status = 'failed';
        action.error = error instanceof Error ? error.message : 'Unknown error';
        this.onActionUpdate?.(action);
      }
    }

    return results;
  }

  private async executeAction(
    action: AgentAction,
    context: Partial<AgentContext>
  ): Promise<AgentWorkflowResult> {
    const result: AgentWorkflowResult = {
      id: `result-${Date.now()}`,
      type: action.type,
      title: action.title,
      description: action.description,
      data: null,
      agentId: '',
      taskId: '',
      timestamp: new Date(),
    };

    switch (action.type) {
      case 'create_file':
        result.data = await this.createFile(action.parameters);
        break;
      case 'modify_file':
        result.data = await this.modifyFile(action.parameters);
        break;
      case 'delete_file':
        result.data = await this.deleteFile(action.parameters);
        break;
      case 'execute_command':
        result.data = await this.executeCommand(action.parameters);
        break;
      case 'install_package':
        result.data = await this.installPackage(action.parameters);
        break;
      case 'search_web':
        result.data = await this.searchWeb(action.parameters);
        break;
      case 'analyze_code':
        result.data = await this.analyzeCode(action.parameters);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    return result;
  }

  private buildContextPrompt(context: Partial<AgentContext>): string {
    let prompt = 'Current Context:\n\n';

    if (context.fileSystemItems) {
      prompt += `Project Structure:\n${JSON.stringify(context.fileSystemItems, null, 2)}\n\n`;
    }

    if (context.activeFile) {
      prompt += `Active File: ${context.activeFile.name}\n`;
      prompt += `Content:\n${context.activeFile.content}\n\n`;
    }

    if (context.terminalHistory) {
      prompt += `Recent Terminal History:\n${context.terminalHistory.slice(-5).join('\n')}\n\n`;
    }

    if (context.dependencies) {
      prompt += `Dependencies:\n${JSON.stringify(context.dependencies, null, 2)}\n\n`;
    }

    return prompt;
  }

  private buildPreviousWorkContext(context: Partial<AgentContext>): string {
    if (!this.executionState.currentWorkflow) {
      return '';
    }

    let prompt = 'Previous Agent Work in This Workflow:\n\n';
    
    const completedTasks = this.executionState.currentWorkflow.tasks.filter(t => t.status === 'completed');
    
    completedTasks.forEach((task, index) => {
      prompt += `${index + 1}. ${task.title} (${task.agent}):\n`;
      if (task.thinking) {
        prompt += `Output: ${task.thinking.substring(0, 500)}...\n`;
      }
      if (task.actions.length > 0) {
        prompt += `Actions: ${task.actions.map(a => a.title).join(', ')}\n`;
      }
      prompt += '\n';
    });

    return prompt;
  }

  private extractActions(content: string): AgentAction[] {
    const actions: AgentAction[] = [];
    
    console.log('Extracting actions from content:', content.substring(0, 200) + '...');

    // Extract FILE: filename patterns first (highest priority)
    const filePattern = /FILE:\s*([^\n]+)\n```(\w+)?\n([\s\S]*?)```/g;
    let fileMatch;
    while ((fileMatch = filePattern.exec(content)) !== null) {
      const filename = fileMatch[1].trim();
      const language = fileMatch[2] || 'typescript';
      const fileContent = fileMatch[3].trim();
      
      console.log('Found file:', filename, 'with', fileContent.length, 'characters');
      
      actions.push({
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'create_file',
        title: `Create ${filename}`,
        description: `Create file ${filename} with ${language} content`,
        parameters: { 
          filename: filename,
          name: filename,
          content: fileContent,
          language: language
        },
        status: 'pending',
      });
    }

    // Extract other action patterns
    const actionPatterns = [
      /```action:(\w+)\n([\s\S]*?)```/g,
      /\*\*Action:\*\* (\w+)\n([\s\S]*?)(?=\n\*\*|$)/g,
      /ACTION:\s*(\w+)\s*-\s*(.*?)(?=\n|$)/gi,
      /\d+\.\s*(Create|Install|Add|Write|Implement|Generate|Build|Setup|Configure)\s+(.*?)(?=\n|$)/gi,
    ];

    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        try {
          const actionType = match[1].toLowerCase();
          const actionData = match[2];

          actions.push({
            id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: this.mapActionType(actionType),
            title: actionData.title || `${actionType} action`,
            description: actionData.description || actionData || '',
            parameters: { content: actionData },
            status: 'pending',
          });
        } catch (error) {
          console.warn('Failed to parse action:', error);
        }
      }
    }

    // If no formal actions found, create default actions based on agent type
    if (actions.length === 0) {
      console.log('No actions found, creating default action');
      actions.push({
        id: `action-${Date.now()}-default`,
        type: 'analyze_code',
        title: 'Analysis Complete',
        description: 'Completed analysis and provided recommendations',
        parameters: { analysis: content },
        status: 'completed',
      });
    }

    console.log('Extracted', actions.length, 'actions:', actions.map(a => a.title));
    return actions;
  }

  private mapActionType(actionType: string): string {
    const typeMap: { [key: string]: string } = {
      'create': 'create_file',
      'install': 'install_package',
      'add': 'create_file',
      'write': 'create_file',
      'implement': 'modify_file',
      'generate': 'create_file',
      'build': 'execute_command',
      'setup': 'execute_command',
      'configure': 'modify_file',
    };

    return typeMap[actionType] || actionType;
  }

  private extractTitle(userRequest: string): string {
    const words = userRequest.split(' ').slice(0, 8);
    return words.join(' ') + (userRequest.split(' ').length > 8 ? '...' : '');
  }

  // Action implementations
  private async createFile(params: any): Promise<any> {
    // Implementation for creating files
    const { path, content, name, filename, language } = params;
    
    // Determine the file name from various possible parameter names
    const fileName = name || filename || (path && path.split('/').pop()) || 'NewFile.txt';
    const fileContent = content || params.code || '';
    
    console.log('🎯 Creating file:', { 
      fileName, 
      contentLength: fileContent.length,
      hasCallback: !!this.fileSystemCallbacks?.createFile,
      params: Object.keys(params)
    });
    
    if (!fileName || !fileContent) {
      console.error('❌ Missing file name or content:', { fileName, hasContent: !!fileContent });
      return {
        success: false,
        error: 'Missing file name or content'
      };
    }
    
    try {
      // Create the file object using the utility function
      const newFile: FileItem = createNewFile(fileName, fileContent, '');
      
      console.log('✅ Created file object:', {
        id: newFile.id,
        name: newFile.name,
        contentLength: newFile.content.length
      });
      
      // Add the file to the file system via callback
      if (this.fileSystemCallbacks?.createFile) {
        console.log('📁 Adding file to file system via callback');
        this.fileSystemCallbacks.createFile(newFile);
      } else {
        console.warn('⚠️ No file system callback available');
      }
      
      return { 
        success: true, 
        file: {
          id: newFile.id,
          name: newFile.name,
          path: newFile.path,
          content: newFile.content,
          created: true
        }
      };
    } catch (error) {
      console.error('❌ Failed to create file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create file'
      };
    }
  }

  private async modifyFile(params: any): Promise<any> {
    // Implementation for modifying files
    const { path, content, changes } = params;
    
    return { 
      success: true, 
      file: {
        path: path,
        content: content,
        changes: changes || [],
        modified: true
      }
    };
  }

  private async deleteFile(params: any): Promise<any> {
    // Implementation for deleting files
    const { path } = params;
    
    return { 
      success: true, 
      path: path,
      deleted: true
    };
  }

  private async executeCommand(params: any): Promise<any> {
    // Implementation for executing terminal commands
    const { command, workingDirectory } = params;
    
    try {
      let output: string;
      let error: string | undefined;
      
      if (this.terminalExecutor) {
        // Use the terminal context to execute the command
        const result = await this.terminalExecutor(command);
        output = result.output;
        error = result.error;
      } else {
        // Fallback to simulation
        const simulatedOutput = this.simulateCommandExecution(command);
        output = simulatedOutput;
      }
      
      return { 
        success: true, 
        command: command,
        output: output,
        error: error,
        workingDirectory: workingDirectory || '~/',
        executed: true
      };
    } catch (err) {
      return {
        success: false,
        command: command,
        error: err instanceof Error ? err.message : 'Command execution failed',
        workingDirectory: workingDirectory || '~/',
        executed: false
      };
    }
  }

  private simulateCommandExecution(command: string): string {
    const cmd = command.toLowerCase().trim();
    
    if (cmd.startsWith('npm install')) {
      const packageName = cmd.replace('npm install', '').trim();
      return `+ ${packageName}@latest\nadded 1 package in 2.3s`;
    }
    
    if (cmd.startsWith('npm run')) {
      const script = cmd.replace('npm run', '').trim();
      return `> ${script}\n\n✓ ${script} completed successfully`;
    }
    
    if (cmd === 'ls' || cmd === 'dir') {
      return `src/\nnode_modules/\npackage.json\nREADME.md\ntsconfig.json`;
    }
    
    if (cmd === 'pwd') {
      return '/Users/developer/ai-code-editor';
    }
    
    if (cmd.startsWith('git')) {
      return `git ${cmd.replace('git', '').trim()}\n✓ Git operation completed`;
    }
    
    return `Command "${command}" executed successfully`;
  }

  private async installPackage(params: any): Promise<any> {
    // Implementation for installing packages
    const { packageName, version, dev } = params;
    
    const installCommand = `npm install ${dev ? '-D ' : ''}${packageName}${version ? `@${version}` : ''}`;
    const output = await this.executeCommand({ command: installCommand });
    
    return { 
      success: true, 
      package: packageName,
      version: version || 'latest',
      dev: dev || false,
      installCommand: installCommand,
      output: output.output,
      installed: true
    };
  }

  private async searchWeb(params: any): Promise<any> {
    // Implementation for web search
    try {
      const results = await webSearchService.search(params.query);
      return { success: true, results };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Search failed' };
    }
  }

  private async analyzeCode(params: any): Promise<any> {
    // Implementation for code analysis
    const { code, language, filePath } = params;
    
    // Simple code analysis simulation
    const analysis = {
      language: language || 'unknown',
      lines: code ? code.split('\n').length : 0,
      characters: code ? code.length : 0,
      functions: code ? (code.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length : 0,
      classes: code ? (code.match(/class\s+\w+/g) || []).length : 0,
      imports: code ? (code.match(/import\s+.*from|require\s*\(/g) || []).length : 0,
      complexity: 'medium', // Simplified complexity analysis
      suggestions: [
        'Consider adding type annotations',
        'Add error handling',
        'Consider breaking down large functions',
        'Add unit tests'
      ]
    };
    
    return { 
      success: true, 
      filePath: filePath,
      analysis: analysis,
      analyzed: true
    };
  }

  getExecutionState(): AgentExecutionState {
    return this.executionState;
  }

  updateAgents(agents: AgentConfig[]): void {
    this.agents.clear();
    agents.forEach(agent => this.agents.set(agent.id, agent));
  }

  updateModels(models: AIModelConfig[]): void {
    this.models.clear();
    models.forEach(model => this.models.set(model.id, model));
  }
} 