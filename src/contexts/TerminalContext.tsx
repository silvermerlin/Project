import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TerminalLine {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

interface TerminalContextType {
  lines: TerminalLine[];
  executeCommand: (command: string) => Promise<{ output: string; error?: string }>;
  clearTerminal: () => void;
  addLine: (line: Omit<TerminalLine, 'id' | 'timestamp'>) => void;
  getHistory: () => string[];
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
};

interface TerminalProviderProps {
  children: ReactNode;
}

export const TerminalProvider: React.FC<TerminalProviderProps> = ({ children }) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: '1',
      type: 'output',
      content: 'Welcome to AI Code Editor Terminal',
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'output',
      content: 'AI agents can now execute commands through this terminal',
      timestamp: new Date(),
    },
  ]);

  const addLine = useCallback((line: Omit<TerminalLine, 'id' | 'timestamp'>) => {
    const newLine: TerminalLine = {
      ...line,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setLines(prev => [...prev, newLine]);
  }, []);

  const executeCommand = useCallback(async (command: string): Promise<{ output: string; error?: string }> => {
    // Add command to terminal
    addLine({
      type: 'command',
      content: `$ ${command}`,
    });

    // Simulate command execution
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = simulateCommand(command);
        
        // Add output to terminal
        addLine({
          type: result.error ? 'error' : 'output',
          content: result.error || result.output,
        });
        
        resolve(result);
      }, 200);
    });
  }, [addLine]);

  const clearTerminal = useCallback(() => {
    setLines([]);
  }, []);

  const getHistory = useCallback(() => {
    return lines
      .filter(line => line.type === 'command')
      .map(line => line.content.replace(/^\$ /, ''))
      .slice(-10); // Return last 10 commands
  }, [lines]);

  const simulateCommand = (command: string): { output: string; error?: string } => {
    const cmd = command.toLowerCase().trim();
    
    if (cmd === 'help' || cmd === '--help') {
      return {
        output: `Available commands:
  help          Show this help message
  ls            List directory contents
  pwd           Print working directory
  clear         Clear terminal
  date          Show current date and time
  echo <text>   Display text
  node -v       Show Node.js version
  npm -v        Show npm version
  git status    Show git status
  
Note: Commands are executed by AI agents when needed.`
      };
    }
    
    if (cmd === 'ls' || cmd === 'dir') {
      return {
        output: `src/
node_modules/
public/
package.json
README.md
tsconfig.json
vite.config.ts`
      };
    }
    
    if (cmd === 'pwd') {
      return { output: '/Users/developer/ai-code-editor' };
    }
    
    if (cmd === 'clear') {
      clearTerminal();
      return { output: '' };
    }
    
    if (cmd === 'date') {
      return { output: new Date().toString() };
    }
    
    if (cmd.startsWith('echo ')) {
      return { output: cmd.substring(5) };
    }
    
    if (cmd === 'node -v' || cmd === 'node --version') {
      return { output: 'v18.17.0' };
    }
    
    if (cmd === 'npm -v' || cmd === 'npm --version') {
      return { output: '9.6.7' };
    }
    
    if (cmd.startsWith('npm install')) {
      const packageName = cmd.replace('npm install', '').trim();
      return {
        output: `+ ${packageName}@latest
added 1 package in 2.3s`
      };
    }
    
    if (cmd.startsWith('npm run')) {
      const script = cmd.replace('npm run', '').trim();
      return {
        output: `> ${script}

✓ ${script} completed successfully`
      };
    }
    
    if (cmd === 'git status') {
      return {
        output: `On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   src/App.tsx
	modified:   src/components/Editor.tsx

no changes added to commit (use "git add" or "git commit -a")`
      };
    }
    
    if (cmd.startsWith('git')) {
      return {
        output: `git ${cmd.replace('git', '').trim()}
✓ Git operation completed`
      };
    }
    
    return {
      output: `Command "${command}" executed successfully`
    };
  };

  const value: TerminalContextType = {
    lines,
    executeCommand,
    clearTerminal,
    addLine,
    getHistory,
  };

  return (
    <TerminalContext.Provider value={value}>
      {children}
    </TerminalContext.Provider>
  );
}; 