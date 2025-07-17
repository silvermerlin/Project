import React, { useRef, useState } from 'react';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import {
  FileText,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  Upload,
  Download,
  Search,
  Settings,
  Code,
  Sparkles,
  Package,
  GitBranch,
  Play,
  Bug,
  Puzzle,
  Users,
  Database,
  Zap,
  Globe,
  Server,
  Monitor,
  Layers,
  Box,
  Grid3x3,
  Braces,
  Terminal,
  Cloud,
  Shield,
  Workflow,
  Beaker,
  FileJson,
  Palette,
  Cpu,
  Activity,
  Eye,
  HelpCircle,
  User,
  Clock,
  BookOpen,
  Star,
  Heart,
  Coffee,
  Lightbulb,
  Target,
  Rocket,
  Trophy,
  Gem,
  Crown,
  Flame,
  Thunder,
  Atom,
  Hexagon,
  Octagon,
  Trash2
} from 'lucide-react';
import { FileItem, FolderItem, FileSystemItem } from '../utils/fileUtils';
import { cn } from '../utils';

interface SidebarProps {
  fileSystemItems: FileSystemItem[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onNewFile: (parentFolderId?: string) => void;
  onOpenFile: (files: FileList) => void;
  onOpenFolder: (files: FileList) => void;
  onDownloadFile: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onOpenSettings: () => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onOpenInTerminal: (path: string) => void;
  className?: string;
}

type ActivityTab = 'explorer' | 'search' | 'source-control' | 'extensions' | 'run-debug' | 'remote' | 'account' | 'settings';

interface ActivityBarItem {
  id: ActivityTab;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface Extension {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  icon: React.ReactNode;
  installed: boolean;
  popular?: boolean;
}

const activityBarItems: ActivityBarItem[] = [
  { id: 'explorer', icon: <FolderOpen className="w-6 h-6" />, label: 'Explorer' },
  { id: 'search', icon: <Search className="w-6 h-6" />, label: 'Search' },
  { id: 'source-control', icon: <GitBranch className="w-6 h-6" />, label: 'Source Control', badge: 3 },
  { id: 'extensions', icon: <Puzzle className="w-6 h-6" />, label: 'Extensions' },
  { id: 'run-debug', icon: <Play className="w-6 h-6" />, label: 'Run and Debug' },
  { id: 'remote', icon: <Server className="w-6 h-6" />, label: 'Remote Explorer' },
];

const mockExtensions: Extension[] = [
  { id: 'prettier', name: 'Prettier - Code formatter', description: 'Code formatter using prettier', author: 'Prettier', version: '10.1.0', icon: <Palette className="w-4 h-4" />, installed: true },
  { id: 'eslint', name: 'ESLint', description: 'Integrates ESLint JavaScript into VS Code', author: 'Microsoft', version: '2.4.2', icon: <Shield className="w-4 h-4" />, installed: true },
  { id: 'gitlens', name: 'GitLens — Git supercharged', description: 'Supercharge Git capabilities', author: 'GitKraken', version: '14.3.0', icon: <Eye className="w-4 h-4" />, installed: true },
  { id: 'thunder', name: 'Thunder Client', description: 'Lightweight Rest API Client', author: 'Ranga Vadhineni', version: '2.11.3', icon: <Zap className="w-4 h-4" />, installed: true },
  { id: 'copilot', name: 'GitHub Copilot', description: 'AI pair programmer', author: 'GitHub', version: '1.102.0', icon: <Cpu className="w-4 h-4" />, installed: true },
  { id: 'live-server', name: 'Live Server', description: 'Launch development local server', author: 'Ritwick Dey', version: '5.7.9', icon: <Globe className="w-4 h-4" />, installed: false, popular: true },
  { id: 'bracket-pair', name: 'Bracket Pair Colorizer', description: 'Colorize matching brackets', author: 'CoenraadS', version: '1.0.61', icon: <Braces className="w-4 h-4" />, installed: false, popular: true },
  { id: 'auto-rename', name: 'Auto Rename Tag', description: 'Automatically rename paired HTML/XML tag', author: 'Jun Han', version: '0.1.10', icon: <Target className="w-4 h-4" />, installed: false },
  { id: 'material-icons', name: 'Material Icon Theme', description: 'Material Design Icons for Visual Studio Code', author: 'Philipp Kief', version: '4.29.0', icon: <Gem className="w-4 h-4" />, installed: false, popular: true },
  { id: 'todo-highlight', name: 'TODO Highlight', description: 'Highlight TODO, FIXME and other annotations', author: 'Wayou Liu', version: '1.0.5', icon: <Lightbulb className="w-4 h-4" />, installed: false },
];

const Sidebar: React.FC<SidebarProps> = ({
  fileSystemItems,
  activeFileId,
  onFileSelect,
  onNewFile,
  onOpenFile,
  onOpenFolder,
  onDownloadFile,
  onToggleFolder,
  onOpenSettings,
  onDeleteFile,
  onRenameFile,
  onOpenInTerminal,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<ActivityTab>('explorer');
  const [searchQuery, setSearchQuery] = useState('');
  const [extensionFilter, setExtensionFilter] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    targetItem: FileSystemItem | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    targetItem: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onOpenFile(e.target.files);
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onOpenFolder(e.target.files);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileSystemItem) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetItem: item,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      x: 0,
      y: 0,
      targetItem: null,
    });
  };

  const getContextMenuItems = (item: FileSystemItem): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (item.type === 'file') {
      items.push(
        { id: 'open', label: 'Open', icon: <FileText className="w-4 h-4" />, action: () => onFileSelect(item.id) },
        { id: 'open-to-side', label: 'Open to the Side', icon: <FileText className="w-4 h-4" />, action: () => onFileSelect(item.id) },
        { separator: true },
        { id: 'run', label: 'Run Code', icon: <Play className="w-4 h-4" />, action: () => console.log('Run code for', item.name) },
        { id: 'debug', label: 'Debug Code', icon: <Settings className="w-4 h-4" />, action: () => console.log('Debug code for', item.name) },
        { separator: true },
        { id: 'reveal', label: 'Reveal in File Explorer', shortcut: 'Shift+Alt+R', action: () => console.log('Reveal', item.name) },
        { id: 'terminal', label: 'Open in Integrated Terminal', action: () => onOpenInTerminal(item.path) },
        { separator: true },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', action: () => navigator.clipboard.writeText(item.name) },
        { id: 'copy-path', label: 'Copy Path', shortcut: 'Ctrl+Shift+C', action: () => navigator.clipboard.writeText(item.path) },
        { id: 'copy-relative', label: 'Copy Relative Path', action: () => navigator.clipboard.writeText(item.path) },
        { separator: true },
        { id: 'rename', label: 'Rename...', shortcut: 'F2', action: () => {
          const newName = prompt('Enter new name:', item.name);
          if (newName && newName !== item.name) {
            onRenameFile(item.id, newName);
          }
        }},
        { id: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, action: () => {
          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            onDeleteFile(item.id);
          }
        }},
      );
    } else if (item.type === 'folder') {
      items.push(
        { id: 'new-file', label: 'New File...', icon: <Plus className="w-4 h-4" />, action: () => onNewFile(item.id) },
        { id: 'new-folder', label: 'New Folder...', icon: <Folder className="w-4 h-4" />, action: () => console.log('New folder in', item.name) },
        { separator: true },
        { id: 'terminal', label: 'Open in Integrated Terminal', action: () => onOpenInTerminal(item.path) },
        { separator: true },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', action: () => navigator.clipboard.writeText(item.name) },
        { id: 'copy-path', label: 'Copy Path', shortcut: 'Ctrl+Shift+C', action: () => navigator.clipboard.writeText(item.path) },
        { separator: true },
        { id: 'rename', label: 'Rename...', shortcut: 'F2', action: () => {
          const newName = prompt('Enter new name:', item.name);
          if (newName && newName !== item.name) {
            onRenameFile(item.id, newName);
          }
        }},
        { id: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, action: () => {
          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            onDeleteFile(item.id);
          }
        }},
      );
    }

    return items;
  };

  const getFileIcon = (language: string) => {
    const iconMap: { [key: string]: string } = {
      javascript: '🟨',
      typescript: '🔷',
      python: '🐍',
      java: '☕',
      html: '🌐',
      css: '🎨',
      json: '📄',
      markdown: '📝',
      jsx: '⚛️',
      tsx: '⚛️',
      vue: '💚',
      php: '🐘',
      go: '🐹',
      rust: '🦀',
      cpp: '⚙️',
      csharp: '💠',
      swift: '🦉',
      kotlin: '🎯',
      dart: '🎯',
    };
    return iconMap[language] || '📄';
  };

  const renderFileSystemItem = (item: FileSystemItem, depth: number = 0): React.ReactNode => {
    const paddingLeft = depth * 12;

    if (item.type === 'file') {
      const fileItem = item as FileItem;
      return (
        <div
          key={item.id}
          className={cn(
            "group flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-smooth",
            "hover:bg-editor-tab",
            activeFileId === item.id ? "bg-editor-tab-active" : ""
          )}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={() => onFileSelect(item.id)}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <span className="text-sm">{getFileIcon(fileItem.language)}</span>
          <span className="text-sm text-editor-text flex-1 truncate" title={item.name}>
            {item.name}
          </span>
          {fileItem.isModified && (
            <div className="w-2 h-2 bg-editor-accent rounded-full" />
          )}
        </div>
      );
    }

    if (item.type === 'folder') {
      const folderItem = item as FolderItem;
      return (
        <div key={item.id}>
          <div
            className="group flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-smooth hover:bg-editor-tab"
            style={{ paddingLeft: `${paddingLeft + 8}px` }}
            onClick={() => onToggleFolder(item.id)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            <div className="flex items-center gap-1">
              {folderItem.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-editor-text-secondary" />
              ) : (
                <ChevronRight className="w-4 h-4 text-editor-text-secondary" />
              )}
              {folderItem.isExpanded ? (
                <FolderOpen className="w-4 h-4 text-editor-accent" />
              ) : (
                <Folder className="w-4 h-4 text-editor-text-secondary" />
              )}
            </div>
            <span className="text-sm font-medium text-editor-text" title={item.name}>
              {item.name}
            </span>
          </div>
          
          {folderItem.isExpanded && (
            <div className="animate-fade-in">
              {folderItem.children.map(child => renderFileSystemItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const renderExplorerContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-editor-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide">Explorer</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewFile}
              className="p-1 rounded hover:bg-editor-border transition-colors"
              title="New File"
            >
              <Plus className="w-4 h-4 text-editor-text-secondary" />
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="p-1 rounded hover:bg-editor-border transition-colors"
              title="Open Folder"
            >
              <FolderOpen className="w-4 h-4 text-editor-text-secondary" />
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={onNewFile}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-editor-accent hover:bg-editor-accent-hover text-white rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            New File
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-editor-tab hover:bg-editor-border text-editor-text rounded transition-colors"
            >
              <FileText className="w-4 h-4" />
              Open File
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-editor-tab hover:bg-editor-border text-editor-text rounded transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Open Folder
            </button>
          </div>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto editor-scrollbar">
        <div className="p-2">
          {fileSystemItems.length === 0 ? (
            <div className="text-center py-8 text-editor-text-secondary">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files or folders open</p>
              <p className="text-xs mt-1">Create new files or open existing ones</p>
            </div>
          ) : (
            <div className="space-y-1">
              {fileSystemItems.map(item => renderFileSystemItem(item))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept=".txt,.js,.jsx,.ts,.tsx,.py,.java,.html,.css,.json,.md,.xml,.yaml,.yml,.sql,.sh,.dockerfile,.vue,.svelte,.php,.rb,.go,.rs,.swift,.kt,.dart,.c,.cpp,.cs,.sass,.scss,.less,.log,.gitignore,.env,.config,.conf,.ini,.toml,.lock,.mod,.sum,.properties,.gradle,.pom,.xml,.jar,.war,.ear,.class,.wasm,.wat,.sol,.vyper,.cairo,.move,.clarity,.scilla,.teal,.ink,.cadence,.cdc,.flow,.pact,.chaincode,.go,.rs,.py,.js,.ts,.sol,.cairo,.move,.clarity,.scilla,.teal,.ink,.cadence,.cdc,.flow,.pact,.chaincode"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        onChange={handleFolderInputChange}
        className="hidden"
      />
    </div>
  );

  const renderSearchContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide mb-3">Search</h3>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded text-sm text-editor-text placeholder-editor-text-secondary focus:outline-none focus:border-editor-accent"
          />
          <input
            type="text"
            placeholder="Files to include"
            className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded text-sm text-editor-text placeholder-editor-text-secondary focus:outline-none focus:border-editor-accent"
          />
        </div>
      </div>
      <div className="flex-1 p-3">
        <div className="text-center py-8 text-editor-text-secondary">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No results found</p>
        </div>
      </div>
    </div>
  );

  const renderSourceControlContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide mb-3">Source Control</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-editor-text">
            <GitBranch className="w-4 h-4" />
            <span>main</span>
          </div>
          <div className="text-xs text-editor-text-secondary">
            3 changes
          </div>
        </div>
      </div>
      <div className="flex-1 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-editor-text">
            <span className="text-orange-400">M</span>
            <span>src/App.tsx</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-editor-text">
            <span className="text-green-400">A</span>
            <span>src/components/Sidebar.tsx</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-editor-text">
            <span className="text-red-400">D</span>
            <span>old-file.txt</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExtensionsContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide mb-3">Extensions</h3>
        <input
          type="text"
          placeholder="Search Extensions in Marketplace"
          value={extensionFilter}
          onChange={(e) => setExtensionFilter(e.target.value)}
          className="w-full px-3 py-2 bg-editor-tab border border-editor-border rounded text-sm text-editor-text placeholder-editor-text-secondary focus:outline-none focus:border-editor-accent"
        />
      </div>
      <div className="flex-1 overflow-y-auto editor-scrollbar">
        <div className="p-2">
          {/* Installed Extensions */}
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide mb-2">Installed</h4>
            <div className="space-y-1">
              {mockExtensions.filter(ext => ext.installed).map(extension => (
                <div key={extension.id} className="flex items-start gap-3 p-2 rounded hover:bg-editor-tab transition-colors">
                  <div className="flex-shrink-0 p-1 bg-editor-border rounded">
                    {extension.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-editor-text truncate">{extension.name}</h5>
                    <p className="text-xs text-editor-text-secondary truncate">{extension.description}</p>
                    <p className="text-xs text-editor-text-secondary">
                      {extension.author} • {extension.version}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Extensions */}
          <div>
            <h4 className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide mb-2">Popular</h4>
            <div className="space-y-1">
              {mockExtensions.filter(ext => !ext.installed && ext.popular).map(extension => (
                <div key={extension.id} className="flex items-start gap-3 p-2 rounded hover:bg-editor-tab transition-colors">
                  <div className="flex-shrink-0 p-1 bg-editor-border rounded">
                    {extension.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-editor-text truncate">{extension.name}</h5>
                    <p className="text-xs text-editor-text-secondary truncate">{extension.description}</p>
                    <p className="text-xs text-editor-text-secondary">
                      {extension.author} • {extension.version}
                    </p>
                  </div>
                  <button className="text-xs bg-editor-accent hover:bg-editor-accent-hover text-white px-2 py-1 rounded">
                    Install
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRunDebugContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide mb-3">Run and Debug</h3>
        <button className="w-full flex items-center gap-2 px-3 py-2 bg-editor-accent hover:bg-editor-accent-hover text-white rounded transition-colors">
          <Play className="w-4 h-4" />
          Run and Debug
        </button>
      </div>
      <div className="flex-1 p-3">
        <div className="text-center py-8 text-editor-text-secondary">
          <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No debug configuration</p>
          <p className="text-xs mt-1">Create a launch.json file</p>
        </div>
      </div>
    </div>
  );

  const renderRemoteContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-editor-border">
        <h3 className="text-xs font-semibold text-editor-text-secondary uppercase tracking-wide mb-3">Remote Explorer</h3>
      </div>
      <div className="flex-1 p-3">
        <div className="text-center py-8 text-editor-text-secondary">
          <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No remote connections</p>
          <p className="text-xs mt-1">Connect to a remote server</p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'explorer':
        return renderExplorerContent();
      case 'search':
        return renderSearchContent();
      case 'source-control':
        return renderSourceControlContent();
      case 'extensions':
        return renderExtensionsContent();
      case 'run-debug':
        return renderRunDebugContent();
      case 'remote':
        return renderRemoteContent();
      default:
        return renderExplorerContent();
    }
  };

  return (
    <div className={cn("flex h-full", className)}>
      {/* Activity Bar */}
      <div className="w-12 bg-editor-sidebar border-r border-editor-border flex flex-col">
        <div className="flex-1 py-2">
          {activityBarItems.map((item) => (
            <div key={item.id} className="relative">
              <button
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full h-12 flex items-center justify-center relative transition-colors",
                  "hover:bg-editor-tab",
                  activeTab === item.id 
                    ? "text-editor-text" 
                    : "text-editor-text-secondary"
                )}
                title={item.label}
              >
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-editor-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
              {activeTab === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-editor-accent" />
              )}
            </div>
          ))}
        </div>
        
        {/* Bottom icons */}
        <div className="border-t border-editor-border py-2">
          <button
            className="w-full h-12 flex items-center justify-center text-editor-text-secondary hover:text-editor-text transition-colors"
            title="Accounts"
          >
            <User className="w-6 h-6" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full h-12 flex items-center justify-center text-editor-text-secondary hover:text-editor-text transition-colors"
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Sidebar Content */}
      <div className="flex-1 bg-editor-sidebar border-r border-editor-border">
        {renderContent()}
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenu.targetItem ? getContextMenuItems(contextMenu.targetItem) : []}
        onClose={closeContextMenu}
      />

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        multiple
        onChange={handleFolderInputChange}
        className="hidden"
      />
    </div>
  );
};

export default Sidebar; 