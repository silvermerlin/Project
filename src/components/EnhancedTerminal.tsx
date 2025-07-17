import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  AlertCircle, 
  FileText, 
  Bug, 
  Globe, 
  Zap,
  Copy, 
  Trash2,
  Maximize2,
  Minimize2,
  X,
  Plus
} from 'lucide-react';
import { cn } from '../utils';
import { apiService } from '../services/api';

interface TerminalInstance {
  id: string;
  name: string;
  cwd: string;
  isActive: boolean;
  history: string[];
  currentCommand: string;
  output: string[];
}

interface EnhancedTerminalProps {
  className?: string;
  onOpenInTerminal?: (path: string) => void;
}

type TabType = 'problems' | 'output' | 'debug' | 'terminal' | 'ports' | 'postman';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const terminalTabs: TabConfig[] = [
  { id: 'problems', label: 'Problems', icon: <AlertCircle className="w-4 h-4" />, badge: 0 },
  { id: 'output', label: 'Output', icon: <FileText className="w-4 h-4" /> },
  { id: 'debug', label: 'Debug Console', icon: <Bug className="w-4 h-4" /> },
  { id: 'terminal', label: 'Terminal', icon: <TerminalIcon className="w-4 h-4" /> },
  { id: 'ports', label: 'Ports', icon: <Globe className="w-4 h-4" /> },
  { id: 'postman', label: 'Postman Console', icon: <Zap className="w-4 h-4" /> },
];

const EnhancedTerminal: React.FC<EnhancedTerminalProps> = ({ className, onOpenInTerminal }) => {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [isMaximized, setIsMaximized] = useState(false);
  const [terminals, setTerminals] = useState<TerminalInstance[]>([
    {
      id: '1',
      name: 'Terminal 1',
      cwd: '/workspace',
      isActive: true,
      history: [],
      currentCommand: '',
      output: [
        'Welcome to AI Code Editor Terminal',
        'AI agents can now execute commands through this terminal',
        'Connected to Railway backend',
        ''
      ],
    }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState('1');
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTerminal = terminals.find(t => t.id === activeTerminalId);

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [terminals]);

  useEffect(() => {
    if (activeTab === 'terminal' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab, activeTerminalId]);

  const createNewTerminal = () => {
    const newTerminal: TerminalInstance = {
      id: Date.now().toString(),
      name: `Terminal ${terminals.length + 1}`,
      cwd: activeTerminal?.cwd || '/workspace',
      isActive: false,
      history: [],
      currentCommand: '',
      output: [
        'Welcome to AI Code Editor Terminal',
        'AI agents can now execute commands through this terminal',
        'Connected to Railway backend',
        ''
      ],
    };
    
    setTerminals(prev => prev.map(t => ({ ...t, isActive: false })).concat(newTerminal));
    setActiveTerminalId(newTerminal.id);
  };

  const closeTerminal = (terminalId: string) => {
    if (terminals.length > 1) {
      setTerminals(prev => prev.filter(t => t.id !== terminalId));
      if (activeTerminalId === terminalId) {
        const remainingTerminals = terminals.filter(t => t.id !== terminalId);
        setActiveTerminalId(remainingTerminals[0]?.id || '');
      }
    }
  };

  const switchTerminal = (terminalId: string) => {
    setActiveTerminalId(terminalId);
    setTerminals(prev => prev.map(t => ({ 
      ...t, 
      isActive: t.id === terminalId 
    })));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeTerminal) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = activeTerminal.history;
      const currentIndex = history.indexOf(activeTerminal.currentCommand);
      if (currentIndex < history.length - 1) {
        const newCommand = history[history.length - 1 - (currentIndex + 1)];
        updateTerminalCommand(activeTerminalId, newCommand);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const history = activeTerminal.history;
      const currentIndex = history.indexOf(activeTerminal.currentCommand);
      if (currentIndex > 0) {
        const newCommand = history[history.length - 1 - (currentIndex - 1)];
        updateTerminalCommand(activeTerminalId, newCommand);
      } else if (currentIndex === 0) {
        updateTerminalCommand(activeTerminalId, '');
      }
    }
  };

  const updateTerminalCommand = (terminalId: string, command: string) => {
    setTerminals(prev => prev.map(t => 
      t.id === terminalId ? { ...t, currentCommand: command } : t
    ));
  };

  const handleExecuteCommand = async (command: string) => {
    if (!command.trim() || !activeTerminal) return;

    setIsExecuting(true);

    // Add command to output
    setTerminals(prev => prev.map(t => 
      t.id === activeTerminalId 
        ? { 
            ...t, 
            history: [...t.history, command],
            currentCommand: '',
            output: [...t.output, `$ ${command}`]
          }
        : t
    ));

    try {
      // Execute command on Railway backend
      const result = await apiService.executeCommand(command, activeTerminal.cwd);
      
      // Add output to terminal
      setTerminals(prev => prev.map(t => 
        t.id === activeTerminalId 
          ? { 
              ...t, 
              output: [...t.output, result.output || 'Command executed successfully'],
              cwd: result.cwd || t.cwd
            }
          : t
      ));
      
      // Update CWD for certain commands
      if (command.startsWith('cd ')) {
        const newPath = command.substring(3).trim();
        setTerminals(prev => prev.map(t => 
          t.id === activeTerminalId 
            ? { ...t, cwd: newPath }
            : t
        ));
      }
    } catch (error) {
      console.error('Command execution failed:', error);
      // Add error to output
      setTerminals(prev => prev.map(t => 
        t.id === activeTerminalId 
          ? { 
              ...t, 
              output: [...t.output, `Error: ${error instanceof Error ? error.message : 'Command failed'}`]
            }
          : t
      ));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTerminal?.currentCommand.trim() && !isExecuting) {
      handleExecuteCommand(activeTerminal.currentCommand);
    }
  };

  const copyTerminalContent = () => {
    const content = activeTerminal?.output.join('\n') || '';
    navigator.clipboard.writeText(content);
  };

  const handleClearTerminal = () => {
    setTerminals(prev => prev.map(t => 
      t.id === activeTerminalId 
        ? { ...t, output: ['Terminal cleared', ''] }
        : t
    ));
  };

  // const openInTerminal = (path: string) => {
  //   if (onOpenInTerminal) {
  //     onOpenInTerminal(path);
  //   }
  //   // Update current terminal's CWD
  //   setTerminals(prev => prev.map(t => 
  //     t.id === activeTerminalId 
  //       ? { ...t, cwd: path }
  //       : t
  //   ));
  // };

  const renderTerminalTabs = () => (
    <div className="flex items-center bg-editor-sidebar border-b border-editor-border">
      {terminals.map((terminal) => (
        <div
          key={terminal.id}
          className={cn(
            "flex items-center gap-2 px-3 py-2 border-r border-editor-border cursor-pointer transition-colors",
            terminal.isActive 
              ? "bg-editor-bg text-editor-text" 
              : "bg-editor-sidebar text-editor-text-secondary hover:text-editor-text"
          )}
          onClick={() => switchTerminal(terminal.id)}
        >
          <TerminalIcon className="w-4 h-4" />
          <span className="text-sm">{terminal.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTerminal(terminal.id);
            }}
            className="ml-2 p-1 rounded hover:bg-editor-border transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={createNewTerminal}
        className="p-2 text-editor-text-secondary hover:text-editor-text transition-colors"
        title="New Terminal"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'problems':
        return (
          <div className="flex-1 overflow-y-auto editor-scrollbar p-4">
            <div className="text-center py-8 text-editor-text-secondary">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No problems detected</p>
              <p className="text-xs mt-1">Issues will appear here as you code</p>
            </div>
          </div>
        );
      
      case 'output':
        return (
          <div className="flex-1 overflow-y-auto editor-scrollbar p-4">
            <div className="text-center py-8 text-editor-text-secondary">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No output</p>
              <p className="text-xs mt-1">Build and run output will appear here</p>
            </div>
          </div>
        );
      
      case 'debug':
        return (
          <div className="flex-1 overflow-y-auto editor-scrollbar p-4">
            <div className="text-center py-8 text-editor-text-secondary">
              <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Debug console</p>
              <p className="text-xs mt-1">Debug output will appear here</p>
            </div>
          </div>
        );
      
      case 'terminal':
        return (
          <>
            {renderTerminalTabs()}
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto editor-scrollbar p-4 font-mono text-sm"
            >
              {activeTerminal?.output.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    "mb-1 whitespace-pre-wrap break-words",
                    line.startsWith('$ ') && "text-editor-accent",
                    line.startsWith('Error: ') && "text-red-400",
                    line.startsWith('Welcome to AI Code Editor Terminal') && "text-editor-text-secondary",
                    line.startsWith('Connected to Railway backend') && "text-editor-text-secondary"
                  )}
                >
                  {line}
                </div>
              ))}
              
              {isExecuting && (
                <div className="flex items-center gap-2 text-editor-text-secondary">
                  <div className="w-2 h-2 bg-editor-accent rounded-full animate-pulse"></div>
                  <span>Executing...</span>
                </div>
              )}
            </div>

            {/* Command input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-editor-border">
              <div className="flex items-center gap-2">
                <span className="text-editor-accent font-mono text-sm flex-shrink-0">
                  {activeTerminal?.cwd} $
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={activeTerminal?.currentCommand || ''}
                  onChange={(e) => updateTerminalCommand(activeTerminalId, e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent border-none outline-none text-editor-text font-mono text-sm"
                  disabled={isExecuting}
                />
              </div>
            </form>
          </>
        );
      
      case 'ports':
        return (
          <div className="flex-1 overflow-y-auto editor-scrollbar p-4">
            <div className="text-center py-8 text-editor-text-secondary">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No ports detected</p>
              <p className="text-xs mt-1">Running servers will appear here</p>
            </div>
          </div>
        );
      
      case 'postman':
        return (
          <div className="flex-1 overflow-y-auto editor-scrollbar p-4">
            <div className="text-center py-8 text-editor-text-secondary">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Postman Console</p>
              <p className="text-xs mt-1">API requests will appear here</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-editor-bg", className)}>
      {/* Tab bar */}
      <div className="flex items-center justify-between bg-editor-sidebar border-b border-editor-border">
        <div className="flex items-center">
          {terminalTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 border-r border-editor-border transition-colors",
                activeTab === tab.id 
                  ? "bg-editor-bg text-editor-text" 
                  : "bg-editor-sidebar text-editor-text-secondary hover:text-editor-text"
              )}
            >
              {tab.icon}
              <span className="text-sm">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-editor-accent text-white text-xs rounded-full px-1.5 py-0.5">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1 p-2">
          <button
            onClick={copyTerminalContent}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearTerminal}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      {renderTabContent()}
    </div>
  );
};

export default EnhancedTerminal; 