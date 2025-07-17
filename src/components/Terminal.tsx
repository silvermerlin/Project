import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Play, X, Minus, Square, Copy, Trash2 } from 'lucide-react';
import { useTerminal } from '../contexts/TerminalContext';
import { cn } from '../utils';

interface TerminalProps {
  className?: string;
}

const Terminal: React.FC<TerminalProps> = ({ className }) => {
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
    // Auto-focus input when terminal is opened
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);



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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const handleClearTerminal = () => {
    clearTerminal();
  };

  const copyTerminalContent = () => {
    const content = lines.map(line => line.content).join('\n');
    navigator.clipboard.writeText(content);
  };

  return (
    <div className={cn("bg-editor-bg border-t border-editor-border flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 bg-editor-tab border-b border-editor-border">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-editor-text" />
          <span className="text-sm font-medium text-editor-text">Terminal</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={copyTerminalContent}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title="Copy terminal content"
          >
            <Copy className="w-4 h-4 text-editor-text-secondary" />
          </button>
          <button
            onClick={handleClearTerminal}
            className="p-1 rounded hover:bg-editor-border transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-4 h-4 text-editor-text-secondary" />
          </button>
        </div>
      </div>

      {/* Terminal content */}
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
    </div>
  );
};

export default Terminal; 