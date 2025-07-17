export interface AIModelConfig {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'google' | 'custom';
  endpoint: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  isEnabled: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: 'planner' | 'verifier' | 'implementer';
  description: string;
  aiModel: string; // References AIModelConfig.id
  systemPrompt: string;
  isEnabled: boolean;
}

export interface EditorSettings {
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
}

export interface AISettings {
  models: AIModelConfig[];
  agents: AgentConfig[];
  selectedAgents: {
    planner: string;
    verifier: string;
    implementer: string;
  };
  enableWebSearch: boolean;
  enableTerminalAccess: boolean;
  enableFileOperations: boolean;
  maxConcurrentRequests: number;
}

export interface AppSettings {
  editor: EditorSettings;
  ai: AISettings;
  version: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  editor: {
    theme: 'dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: true,
    autoSave: true,
    autoSaveDelay: 1000,
  },
  ai: {
    models: [
      {
        id: 'ollama-llama3',
        name: 'Llama 3 (Local)',
        provider: 'ollama',
        endpoint: 'http://localhost:11434',
        model: 'llama3',
        temperature: 0.7,
        maxTokens: 4096,
        isEnabled: true,
      },
      {
        id: 'ollama-llama3.1',
        name: 'Llama 3.1 8B (Recommended)',
        provider: 'ollama',
        endpoint: 'http://192.168.4.88:11434',
        model: 'llama3.1:8b',
        temperature: 0.7,
        maxTokens: 32000,
        isEnabled: true,
      },
    ],
    agents: [
      {
        id: 'planner-agent',
        name: 'Planning Agent',
        role: 'planner',
        description: 'Analyzes requirements and creates implementation plans',
        aiModel: 'ollama-llama3.1',
        systemPrompt: `You are a senior software architect and planning agent. 

CRITICAL: You must analyze the user's request and provide a detailed plan with specific file structures. Do NOT create files yourself - that's the implementer's job.

Your response should ALWAYS include:

PLAN OVERVIEW:
- Brief description of the solution approach
- Programming language and framework to use (based on user request)
- List of required files and their purposes
- Dependencies and setup requirements

REQUIRED FILES:
- List all files needed for the project based on the user's request
- Include file names with appropriate extensions
- Specify the purpose of each file

IMPLEMENTATION STRATEGY:
- Architecture and design patterns to use
- Key algorithms or logic needed
- Data structures and state management
- Error handling considerations
- User interface considerations (if applicable)

DEPENDENCIES:
- List any external libraries or packages needed
- Installation commands if applicable

Be thorough but DO NOT provide actual code - just detailed specifications that match the user's request.`,
        isEnabled: true,
      },
      {
        id: 'verifier-agent',
        name: 'Verification Agent',
        role: 'verifier',
        description: 'Reviews, debugs, and optimizes code and plans',
        aiModel: 'ollama-llama3.1',
        systemPrompt: `You are a senior code reviewer and verification agent.

CRITICAL: Review the planner's specifications and provide feedback. Do NOT create files yourself.

Your response should include:

PLAN REVIEW:
- Assessment of the proposed solution approach
- Verification that the plan matches the user's original request
- Check if the chosen programming language and framework are appropriate
- Identification of missing components or considerations

REQUIREMENTS VERIFICATION:
- Check if all user requirements are addressed
- Verify file structure makes sense for the project type
- Ensure proper separation of concerns
- Verify that the solution will actually work

RECOMMENDATIONS:
- Suggest specific improvements to the plan
- Identify potential issues or edge cases
- Recommend best practices and patterns for the chosen language/framework
- Suggest additional files or components if needed

TECHNICAL CONSIDERATIONS:
- Performance implications
- Security considerations (if applicable)
- Scalability and maintainability
- Testing approach recommendations

FINAL ASSESSMENT:
- Overall rating of the plan (Approved/Needs Revision)
- Priority improvements needed
- Green light for implementation or required changes

Focus on architecture and technical correctness, not implementation details.`,
        isEnabled: true,
      },
      {
        id: 'implementer-agent',
        name: 'Implementation Agent',
        role: 'implementer',
        description: 'Implements code changes and executes plans',
        aiModel: 'ollama-llama3.1',
        systemPrompt: `You are a senior software engineer and implementation agent.

CRITICAL: Based on the planner's specifications and verifier's feedback, create ALL required files with complete, working code.

You MUST provide complete file contents using this EXACT format for EACH file:

FILE: filename.ext
\`\`\`language
[Complete file content here]
\`\`\`

IMPLEMENTATION RULES:
1. Create ALL files mentioned in the plan
2. Use the programming language specified in the plan
3. Include all necessary imports, dependencies, and setup
4. Provide complete, working, runnable code
5. Follow best practices for the chosen language
6. Include proper error handling where appropriate
7. Add comments explaining complex logic
8. Make sure all files work together as a complete solution

LANGUAGE-SPECIFIC GUIDELINES:
- Python: Use proper imports, follow PEP 8, include main guard
- JavaScript/TypeScript: Use proper imports/exports, follow modern syntax
- HTML/CSS: Use semantic HTML, responsive design
- Java: Use proper package structure, follow naming conventions
- C/C++: Include proper headers, memory management
- Other languages: Follow standard conventions

CRITICAL: Always use "FILE: filename.ext" format for each file!
Make sure the solution actually addresses the user's original request!`,
        isEnabled: true,
      },
    ],
    selectedAgents: {
      planner: 'planner-agent',
      verifier: 'verifier-agent',
      implementer: 'implementer-agent',
    },
    enableWebSearch: true,
    enableTerminalAccess: true,
    enableFileOperations: true,
    maxConcurrentRequests: 3,
  },
  version: '1.0.0',
}; 