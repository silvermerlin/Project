// Keyboard shortcuts utility for AI Code Editor

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.enable();
  }

  // Add a new shortcut
  addShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  // Remove a shortcut
  removeShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }

  // Enable keyboard shortcuts
  enable(): void {
    if (!this.isEnabled) {
      document.addEventListener('keydown', this.handleKeyDown);
      this.isEnabled = true;
    }
  }

  // Disable keyboard shortcuts
  disable(): void {
    if (this.isEnabled) {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.isEnabled = false;
    }
  }

  // Get all registered shortcuts
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  // Handle keydown events
  private handleKeyDown(event: KeyboardEvent): void {
    // Don't handle shortcuts when typing in input fields
    if (this.isInputField(event.target as HTMLElement)) {
      return;
    }

    const key = this.getEventKey(event);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      shortcut.action();
    }
  }

  // Check if the target is an input field
  private isInputField(element: HTMLElement | null): boolean {
    if (!element) return false;
    
    const inputTypes = ['input', 'textarea', 'select'];
    const contentEditable = element.getAttribute('contenteditable') === 'true';
    
    return inputTypes.includes(element.tagName.toLowerCase()) || contentEditable;
  }

  // Get shortcut key string
  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.metaKey) parts.push('Meta');
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join('+');
  }

  // Get event key string
  private getEventKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    if (event.metaKey) parts.push('Meta');
    
    parts.push(event.key.toUpperCase());
    
    return parts.join('+');
  }
}

// Default shortcuts
export const createDefaultShortcuts = (
  onSaveFile: () => void,
  onNewFile: () => void,
  onOpenFile: () => void,
  onSearchInFile: () => void,
  onRunCode: () => void,
  onDebugCode: () => void,
  onOpenSettings: () => void
): KeyboardShortcut[] => [
  {
    key: 's',
    ctrlKey: true,
    action: onSaveFile,
    description: 'Save file'
  },
  {
    key: 'n',
    ctrlKey: true,
    action: onNewFile,
    description: 'New file'
  },
  {
    key: 'o',
    ctrlKey: true,
    action: onOpenFile,
    description: 'Open file'
  },
  {
    key: 'f',
    ctrlKey: true,
    action: onSearchInFile,
    description: 'Search in file'
  },
  {
    key: 'F5',
    action: onRunCode,
    description: 'Run code'
  },
  {
    key: 'F9',
    action: onDebugCode,
    description: 'Debug code'
  },
  {
    key: ',',
    ctrlKey: true,
    action: onOpenSettings,
    description: 'Open settings'
  }
];

// Global shortcut manager instance
export const shortcutManager = new KeyboardShortcutManager(); 