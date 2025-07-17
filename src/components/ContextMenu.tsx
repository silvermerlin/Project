import React from 'react';
import { 
  FileText, 
  Folder, 
  Download, 
  Trash2, 
  Edit, 
  Copy, 
  Cut, 
  Terminal,
  Play,
  Settings,
  Eye,
  GitBranch,
  RefreshCw,
  Plus
} from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  x,
  y,
  items,
  onClose
}) => {
  if (!isOpen) return null;

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.action();
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        className="fixed z-50 bg-editor-sidebar border border-editor-border rounded-md shadow-lg py-1 min-w-48"
        style={{ left: x, top: y }}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {item.separator ? (
              <div className="border-t border-editor-border my-1" />
            ) : (
              <button
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left text-sm
                  hover:bg-editor-tab transition-colors
                  ${item.disabled ? 'text-editor-text-secondary cursor-not-allowed' : 'text-editor-text cursor-pointer'}
                `}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && (
                  <span className="w-4 h-4 flex items-center justify-center">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-editor-text-secondary">
                    {item.shortcut}
                  </span>
                )}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

export default ContextMenu; 