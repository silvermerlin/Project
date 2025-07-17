import React, { useState, useRef, useEffect } from 'react';
import { 
  File, 
  Edit, 
  Search, 
  Eye, 
  Navigation, 
  Play, 
  Terminal, 
  HelpCircle,
  ChevronDown,
  Code,
  Minimize2,
  Maximize2,
  X
} from 'lucide-react';
import { cn } from '../utils';

interface MenuBarProps {
  className?: string;
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onSaveFile?: () => void;
  onOpenSettings?: () => void;
}

type MenuType = 'file' | 'edit' | 'selection' | 'view' | 'go' | 'run' | 'terminal' | 'help';

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  separator?: boolean;
  action?: () => void;
  submenu?: MenuItem[];
}

const MenuBar: React.FC<MenuBarProps> = ({ 
  className, 
  onNewFile, 
  onOpenFile, 
  onOpenFolder, 
  onSaveFile, 
  onOpenSettings 
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuType | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems: Record<MenuType, MenuItem[]> = {
    file: [
      { id: 'new', label: 'New File', shortcut: 'Ctrl+N', action: onNewFile },
      { id: 'open', label: 'Open File...', shortcut: 'Ctrl+O', action: onOpenFile },
      { id: 'open-folder', label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: onOpenFolder },
      { id: 'separator1', label: '', separator: true },
      { id: 'save', label: 'Save', shortcut: 'Ctrl+S', action: onSaveFile },
      { id: 'save-as', label: 'Save As...', shortcut: 'Ctrl+Shift+S' },
      { id: 'save-all', label: 'Save All', shortcut: 'Ctrl+K S' },
      { id: 'separator2', label: '', separator: true },
      { id: 'close', label: 'Close Tab', shortcut: 'Ctrl+W' },
      { id: 'close-all', label: 'Close All', shortcut: 'Ctrl+K Ctrl+W' },
      { id: 'separator3', label: '', separator: true },
      { id: 'preferences', label: 'Preferences', shortcut: 'Ctrl+,', action: onOpenSettings },
    ],
    edit: [
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z' },
      { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y' },
      { id: 'separator1', label: '', separator: true },
      { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
      { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
      { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
      { id: 'separator2', label: '', separator: true },
      { id: 'find', label: 'Find', shortcut: 'Ctrl+F' },
      { id: 'replace', label: 'Replace', shortcut: 'Ctrl+H' },
      { id: 'find-in-files', label: 'Find in Files', shortcut: 'Ctrl+Shift+F' },
    ],
    selection: [
      { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A' },
      { id: 'select-line', label: 'Select Line', shortcut: 'Ctrl+L' },
      { id: 'select-word', label: 'Select Word', shortcut: 'Ctrl+D' },
      { id: 'separator1', label: '', separator: true },
      { id: 'multi-cursor', label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+Up' },
      { id: 'multi-cursor-down', label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+Down' },
    ],
    view: [
      { id: 'command-palette', label: 'Command Palette', shortcut: 'Ctrl+Shift+P' },
      { id: 'separator1', label: '', separator: true },
      { id: 'explorer', label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
      { id: 'search', label: 'Search', shortcut: 'Ctrl+Shift+F' },
      { id: 'terminal', label: 'Terminal', shortcut: 'Ctrl+`' },
      { id: 'separator2', label: '', separator: true },
      { id: 'zoom-in', label: 'Zoom In', shortcut: 'Ctrl++' },
      { id: 'zoom-out', label: 'Zoom Out', shortcut: 'Ctrl+-' },
      { id: 'reset-zoom', label: 'Reset Zoom', shortcut: 'Ctrl+0' },
    ],
    go: [
      { id: 'go-to-line', label: 'Go to Line...', shortcut: 'Ctrl+G' },
      { id: 'go-to-file', label: 'Go to File...', shortcut: 'Ctrl+P' },
      { id: 'separator1', label: '', separator: true },
      { id: 'back', label: 'Back', shortcut: 'Alt+Left' },
      { id: 'forward', label: 'Forward', shortcut: 'Alt+Right' },
      { id: 'separator2', label: '', separator: true },
      { id: 'definition', label: 'Go to Definition', shortcut: 'F12' },
      { id: 'references', label: 'Go to References', shortcut: 'Shift+F12' },
    ],
    run: [
      { id: 'run-task', label: 'Run Task...', shortcut: 'Ctrl+Shift+P' },
      { id: 'separator1', label: '', separator: true },
      { id: 'start-debugging', label: 'Start Debugging', shortcut: 'F5' },
      { id: 'start-without-debugging', label: 'Start Without Debugging', shortcut: 'Ctrl+F5' },
      { id: 'stop-debugging', label: 'Stop Debugging', shortcut: 'Shift+F5' },
      { id: 'separator2', label: '', separator: true },
      { id: 'toggle-breakpoint', label: 'Toggle Breakpoint', shortcut: 'F9' },
    ],
    terminal: [
      { id: 'new-terminal', label: 'New Terminal', shortcut: 'Ctrl+Shift+`' },
      { id: 'split-terminal', label: 'Split Terminal', shortcut: 'Ctrl+Shift+5' },
      { id: 'separator1', label: '', separator: true },
      { id: 'kill-terminal', label: 'Kill Terminal', shortcut: 'Ctrl+Shift+K' },
      { id: 'clear-terminal', label: 'Clear Terminal', shortcut: 'Ctrl+K' },
      { id: 'separator2', label: '', separator: true },
      { id: 'select-all-terminal', label: 'Select All', shortcut: 'Ctrl+A' },
      { id: 'copy-selection', label: 'Copy Selection', shortcut: 'Ctrl+C' },
    ],
    help: [
      { id: 'welcome', label: 'Welcome' },
      { id: 'separator1', label: '', separator: true },
      { id: 'docs', label: 'Documentation' },
      { id: 'shortcuts', label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S' },
      { id: 'separator2', label: '', separator: true },
      { id: 'about', label: 'About' },
    ],
  };

  const handleMenuClick = (menu: MenuType) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  };

  const renderMenuItem = (item: MenuItem) => {
    if (item.separator) {
      return <div key={item.id} className="h-px bg-editor-border my-1" />;
    }

    return (
      <button
        key={item.id}
        onClick={() => handleMenuItemClick(item)}
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-editor-accent hover:text-white transition-colors flex items-center justify-between"
      >
        <span>{item.label}</span>
        {item.shortcut && (
          <span className="text-xs text-editor-text-secondary ml-8">{item.shortcut}</span>
        )}
      </button>
    );
  };

  return (
    <div ref={menuRef} className={cn("bg-editor-tab border-b border-editor-border", className)}>
      <div className="flex items-center justify-between h-8">
        {/* Left side - App icon and menu */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-2 sm:px-3">
            <Code className="w-4 h-4 text-editor-accent" />
            <span className="text-sm font-medium text-editor-text hidden md:inline">AI Code Editor</span>
          </div>
          
          <div className="flex items-center">
            {[
              { id: 'file', label: 'File', icon: File },
              { id: 'edit', label: 'Edit', icon: Edit },
              { id: 'selection', label: 'Selection', icon: Search },
              { id: 'view', label: 'View', icon: Eye },
              { id: 'go', label: 'Go', icon: Navigation },
              { id: 'run', label: 'Run', icon: Play },
              { id: 'terminal', label: 'Terminal', icon: Terminal },
              { id: 'help', label: 'Help', icon: HelpCircle },
            ].map((menu) => (
              <div key={menu.id} className="relative">
                <button
                  onClick={() => handleMenuClick(menu.id as MenuType)}
                  className={cn(
                    "px-2 sm:px-3 py-1 text-sm hover:bg-editor-border transition-colors flex items-center gap-1",
                    activeMenu === menu.id ? "bg-editor-border text-editor-text" : "text-editor-text-secondary"
                  )}
                >
                  <menu.icon className="w-3 h-3 sm:hidden" />
                  <span className="hidden sm:inline">{menu.label}</span>
                </button>
                
                {activeMenu === menu.id && (
                  <div className="absolute top-full left-0 min-w-48 bg-editor-sidebar border border-editor-border rounded-md shadow-lg z-50 py-1">
                    {menuItems[menu.id as MenuType].map(renderMenuItem)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Window controls */}
        <div className="flex items-center gap-1 px-2">
          <button
            className="p-1 hover:bg-editor-border rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-3 h-3 text-editor-text-secondary" />
          </button>
          <button
            className="p-1 hover:bg-editor-border rounded transition-colors"
            title="Maximize"
          >
            <Maximize2 className="w-3 h-3 text-editor-text-secondary" />
          </button>
          <button
            className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors"
            title="Close"
          >
            <X className="w-3 h-3 text-editor-text-secondary" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuBar; 