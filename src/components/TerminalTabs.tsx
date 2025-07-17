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
  Play,
  Square,
  Minus,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  X,
  Plus
} from 'lucide-react';
import { useTerminal } from '../contexts/TerminalContext';
import { cn } from '../utils';

interface TerminalTabsProps {
  className?: string;
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

const TerminalTabs: React.FC<TerminalTabsProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const [isMaximized, setIsMaximized] = useState(false);
  const { lines, executeCommand, clearTerminal, getHistory } = useTerminal();
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDirectory, setCurrentDirectory] = useState('~/project');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const commandHistory = getHistory();

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [lines]);

  useEffect(() => {
    // Auto-focus input when terminal tab is active
    if (activeTab === 'terminal' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const handleExecuteCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsExecuting(true);
    setHistoryIndex(-1);

    try {
      await executeCommand(command);
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCommand.trim() && !isExecuting) {
      handleExecuteCommand(currentCommand);
      setCurrentCommand('');
    }
  };

  const copyTerminalContent = () => {
    const content = lines.map(line => line.content).join('\n');
    navigator.clipboard.writeText(content);
  };

  const handleClearTerminal = () => {
    clearTerminal();
  };

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
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto editor-scrollbar p-4 font-mono text-sm"
            >
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={cn(
                    "mb-1 whitespace-pre-wrap break-words",
                    line.type === 'command' && "text-editor-accent",
                    line.type === 'output' && "text-editor-text",
                    line.type === 'error' && "text-red-400"
                  )}
                >
                  {line.content}
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
                  {currentDirectory} $
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-editor-text font-mono text-sm focus:outline-none"
                  placeholder="Type a command..."
                  disabled={isExecuting}
                />
                {isExecuting && (
                  <div className="w-4 h-4 border-2 border-editor-accent border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </form>
          </>
        );
      
      case 'ports':
        return (
          <div className="flex-1 overflow-y-auto editor-scrollbar p-4">
            <div className="text-center py-8 text-editor-text-secondary">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No forwarded ports</p>
              <p className="text-xs mt-1">Local ports will appear here</p>
            </div>
          </div>
        );
      
      case 'postman':
        return (
          <div className="flex-1 overflow-y-auto editor-scrollbar p-4">
            <div className="text-center py-8 text-editor-text-secondary">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Postman Console</p>
              <p className="text-xs mt-1">API requests and responses will appear here</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={cn("bg-editor-bg border-t border-editor-border flex flex-col h-full", className)}>
      {/* Tab Bar */}
      <div className="flex items-center justify-between bg-editor-tab border-b border-editor-border">
        <div className="flex items-center overflow-x-auto editor-scrollbar">
          {terminalTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm border-r border-editor-border hover:bg-editor-tab-active transition-colors",
                activeTab === tab.id
                  ? "bg-editor-tab-active text-editor-text border-b-2 border-editor-accent"
                  : "text-editor-text-secondary"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-editor-accent text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={() => setActiveTab('terminal')}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title="New Terminal"
          >
            <Plus className="w-4 h-4 text-editor-text-secondary" />
          </button>
          <button
            onClick={copyTerminalContent}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title="Copy All"
          >
            <Copy className="w-4 h-4 text-editor-text-secondary" />
          </button>
          <button
            onClick={handleClearTerminal}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4 text-editor-text-secondary" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4 text-editor-text-secondary" />
            ) : (
              <Maximize2 className="w-4 h-4 text-editor-text-secondary" />
            )}
          </button>
          <button
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title="More Actions"
          >
            <MoreHorizontal className="w-4 h-4 text-editor-text-secondary" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default TerminalTabs; 