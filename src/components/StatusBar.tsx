import React from 'react';
import { FileItem } from '../utils/fileUtils';
import { cn } from '../utils';

interface StatusBarProps {
  activeFile: FileItem | null;
  totalFiles: number;
  modifiedFiles: number;
  className?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({
  activeFile,
  totalFiles,
  modifiedFiles,
  className
}) => {
  const getFileStats = () => {
    if (!activeFile) return { lines: 0, characters: 0, words: 0 };
    
    const content = activeFile.content || '';
    const lines = content.split('\n').length;
    const characters = content.length;
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    return { lines, characters, words };
  };

  const { lines, characters, words } = getFileStats();

  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-1 text-xs bg-editor-status text-editor-text-secondary border-t border-editor-border",
      className
    )}>
      <div className="flex items-center gap-4">
        {/* File info */}
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {activeFile ? activeFile.name : 'No file selected'}
          </span>
          {activeFile?.isModified && (
            <span className="text-editor-accent">●</span>
          )}
        </div>

        {/* File statistics */}
        {activeFile && (
          <div className="flex items-center gap-3">
            <span>Ln {lines}</span>
            <span>Col {1}</span>
            <span>{words} words</span>
            <span>{characters} chars</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* File count */}
        <div className="flex items-center gap-2">
          <span>{totalFiles} files</span>
          {modifiedFiles > 0 && (
            <span className="text-editor-accent">{modifiedFiles} modified</span>
          )}
        </div>

        {/* Language indicator */}
        {activeFile && (
          <div className="flex items-center gap-1">
            <span className="text-editor-text-secondary">Language:</span>
            <span className="font-medium">{activeFile.language}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusBar; 