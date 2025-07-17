import React from 'react';
import { 
  X, 
  FileText, 
  Save, 
  Play, 
  Bug, 
  Search, 
  Split, 
  Settings, 
  MoreHorizontal,
  Terminal,
  GitBranch,
  Zap
} from 'lucide-react';
import { FileItem } from '../utils/fileUtils';
import { cn } from '../utils';

interface TabBarProps {
  files: FileItem[];
  activeFileId: string | null;
  onTabClick: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
  onSaveFile: (fileId: string) => void;
  onRunCode?: () => void;
  onDebugCode?: () => void;
  onSearchInFile?: () => void;
  onSplitEditor?: () => void;
  onOpenSettings?: () => void;
}

const getFileIcon = (language: string) => {
  const iconMap: Record<string, string> = {
    'typescript': '🟦',
    'javascript': '🟨',
    'python': '🐍',
    'java': '☕',
    'html': '🌐',
    'css': '🎨',
    'json': '📋',
    'markdown': '📝',
    'xml': '📄',
    'yaml': '⚙️',
    'sql': '🗃️',
    'shell': '🔧',
    'dockerfile': '🐳',
    'vue': '💚',
    'react': '⚛️',
    'svelte': '🧡',
  };
  
  return iconMap[language] || '📄';
};

const TabBar: React.FC<TabBarProps> = ({
  files,
  activeFileId,
  onTabClick,
  onTabClose,
  onSaveFile,
  onRunCode,
  onDebugCode,
  onSearchInFile,
  onSplitEditor,
  onOpenSettings,
}) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-editor-tab border-b border-editor-border">
      <div className="flex items-center min-w-0 overflow-x-auto editor-scrollbar">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-2 px-4 py-2 min-w-0 cursor-pointer border-r border-editor-border group transition-smooth",
              "hover:bg-editor-tab-active",
              activeFileId === file.id
                ? "bg-editor-tab-active border-b-2 border-editor-accent"
                : "bg-editor-tab"
            )}
            onClick={() => onTabClick(file.id)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm flex-shrink-0">
                {getFileIcon(file.language)}
              </span>
              <span
                className={cn(
                  "text-sm truncate max-w-32",
                  activeFileId === file.id
                    ? "text-editor-text"
                    : "text-editor-text-secondary"
                )}
                title={file.name}
              >
                {file.name}
              </span>
              {file.isModified && (
                <div className="w-2 h-2 bg-editor-accent rounded-full flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {file.isModified && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveFile(file.id);
                  }}
                  className="p-1 rounded hover:bg-editor-border transition-colors"
                  title="Save file"
                >
                  <Save className="w-3 h-3 text-editor-text-secondary" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(file.id);
                }}
                className="p-1 rounded hover:bg-editor-border transition-colors"
                title="Close tab"
              >
                <X className="w-3 h-3 text-editor-text-secondary" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-1 px-1 sm:px-2 border-l border-editor-border">
        <button
          onClick={onRunCode}
          className="p-1.5 rounded hover:bg-editor-border transition-colors"
          title="Run Code (F5)"
        >
          <Play className="w-4 h-4 text-editor-text-secondary" />
        </button>
        <button
          onClick={onDebugCode}
          className="p-1.5 rounded hover:bg-editor-border transition-colors"
          title="Debug Code (F9)"
        >
          <Bug className="w-4 h-4 text-editor-text-secondary" />
        </button>
        <button
          onClick={onSearchInFile}
          className="p-1.5 rounded hover:bg-editor-border transition-colors"
          title="Search in File (Ctrl+F)"
        >
          <Search className="w-4 h-4 text-editor-text-secondary" />
        </button>
        <button
          onClick={onSplitEditor}
          className="p-1.5 rounded hover:bg-editor-border transition-colors hidden sm:inline-flex"
          title="Split Editor"
        >
          <Split className="w-4 h-4 text-editor-text-secondary" />
        </button>
        <div className="w-px h-4 bg-editor-border mx-1 hidden sm:block" />
        <button
          className="p-1.5 rounded hover:bg-editor-border transition-colors hidden md:inline-flex"
          title="Terminal"
        >
          <Terminal className="w-4 h-4 text-editor-text-secondary" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-editor-border transition-colors hidden md:inline-flex"
          title="Git"
        >
          <GitBranch className="w-4 h-4 text-editor-text-secondary" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-editor-border transition-colors"
          title="More Actions"
        >
          <MoreHorizontal className="w-4 h-4 text-editor-text-secondary" />
        </button>
      </div>
    </div>
  );
};

export default TabBar; 