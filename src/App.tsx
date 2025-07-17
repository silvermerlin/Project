import React, { useState, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { TerminalProvider, useTerminal } from './contexts/TerminalContext';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import Editor from './components/Editor';
import AgentWorkflowUI from './components/AgentWorkflowUI';
import EnhancedTerminal from './components/EnhancedTerminal';
import SettingsModal from './components/SettingsModal';
import MenuBar from './components/MenuBar';
import BackendStatus from './components/BackendStatus';
import StatusBar from './components/StatusBar';
import FileSearch from './components/FileSearch';
import { apiService } from './services/api';
import { wsService } from './services/websocket';
import { isRailwayBackend } from './config/api';
import { FileSystemItem, FileItem, FolderItem, getFileLanguage } from './utils/fileUtils';
import { shortcutManager, createDefaultShortcuts } from './utils/keyboardShortcuts';

// Types for backend integration
interface BackendFileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  isDirectory: boolean;
}

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  isModified: boolean;
  isLoaded: boolean;
  children?: FileItem[];
  isExpanded?: boolean;
}

const AppContent: React.FC = () => {
  const { } = useSettings();
  const { } = useTerminal();
  
  // State management
  const [fileSystemItems, setFileSystemItems] = useState<FileSystemItem[]>([]);
  const [openFiles, setOpenFiles] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [backendConnected, setBackendConnected] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Get active file
  const activeFile = openFiles.find(f => f.id === activeFileId) || null;

  // Initialize backend connection
  useEffect(() => {
    const initializeBackend = async () => {
      try {
        // Test backend connection
        await apiService.healthCheck();
        setBackendConnected(true);
        
        // Connect WebSocket
        await wsService.connect();
        
        // Set up WebSocket event handlers
        wsService.setEventHandlers({
          onFileCreated: (data) => {
            console.log('📄 File created via WebSocket:', data);
            // Reload file system to show new file
            loadFileSystem(currentPath);
          },
          onFileUpdated: (data) => {
            console.log('📝 File updated via WebSocket:', data);
            // Reload file system to show changes
            loadFileSystem(currentPath);
          },
          onFileDeleted: (data) => {
            console.log('🗑️ File deleted via WebSocket:', data);
            // Reload file system to reflect deletion
            loadFileSystem(currentPath);
          },
          onConnect: () => {
            console.log('✅ WebSocket connected');
          },
          onDisconnect: () => {
            console.log('❌ WebSocket disconnected');
          }
        });
        
        // Load initial file system
        await loadFileSystem();
        
        console.log('✅ Backend connected successfully');
      } catch (error) {
        console.error('❌ Failed to connect to backend:', error);
        setBackendConnected(false);
      }
    };

    initializeBackend();
  }, [currentPath]);

  // Load file system from backend
  const loadFileSystem = async (path: string = '/') => {
    try {
      setIsLoading(true);
      console.log('📁 Loading file system for path:', path);
      const files = await apiService.listFiles(path);
      
      console.log('📁 Files received from backend:', files);
      
      const fileItems: FileSystemItem[] = files.map((file: BackendFileInfo) => {
        if (file.isDirectory) {
          // Convert to FolderItem
          return {
            id: file.path,
            name: file.name,
            path: file.path,
            type: 'folder' as const,
            children: [],
            isExpanded: false
          };
        } else {
          // Convert to FileItem
          return {
            id: file.path,
            name: file.name,
            path: file.path,
            type: 'file' as const,
            content: '',
            language: getFileLanguage(file.name),
            isModified: false,
            isLoaded: false
          };
        }
      });

      console.log('📁 Converted file items:', fileItems);
      setFileSystemItems(fileItems);
      setCurrentPath(path);
    } catch (error) {
      console.error('Error loading file system:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // File operations with backend integration
  const handleNewFile = useCallback(async (parentFolderId?: string) => {
    console.log('📝 Creating new file, parent folder:', parentFolderId);
    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    try {
      const filePath = parentFolderId ? `${parentFolderId}/${fileName}` : `/${fileName}`;
      console.log('📝 Creating file at path:', filePath);
      await apiService.createFile(filePath);
      
      console.log('📝 File created successfully, reloading file system');
      // Reload file system from root to show all files
      await loadFileSystem('/');
    } catch (error) {
      console.error('Error creating file:', error);
      alert('Failed to create file');
    }
  }, []);

  const handleOpenFiles = useCallback(async (fileList: FileList) => {
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const filePath = `/${file.name}`;
        
        // Upload file to backend
        await apiService.uploadFile(file, filePath);
      }
      
      // Reload file system from root to show all uploaded files
      await loadFileSystem('/');
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files');
    }
  }, []);

  const handleOpenFolder = useCallback(async (fileList: FileList) => {
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const filePath = `/${file.webkitRelativePath || file.name}`;
        
        // Upload file to backend
        await apiService.uploadFile(file, filePath);
      }
      
      // Reload file system from root to show all uploaded files
      await loadFileSystem('/');
    } catch (error) {
      console.error('Error uploading folder:', error);
      alert('Failed to upload folder');
    }
  }, []);

  // Helper function to find a file recursively in the file system tree
  const findFileRecursively = (items: FileSystemItem[], fileId: string): FileItem | null => {
    for (const item of items) {
      if (item.id === fileId && item.type === 'file') {
        return item as FileItem;
      }
      if (item.type === 'folder') {
        const folderItem = item as FolderItem;
        const found = findFileRecursively(folderItem.children, fileId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleFileSelect = useCallback(async (fileId: string) => {
    console.log('📄 File selected:', fileId);
    const file = findFileRecursively(fileSystemItems, fileId);
    console.log('📄 Found file:', file);
    if (!file) {
      console.log('❌ File not found');
      return;
    }

    // Check if file is already open
    const isAlreadyOpen = openFiles.some(f => f.id === fileId);
    if (isAlreadyOpen) {
      console.log('📄 File already open, switching to it');
      setActiveFileId(fileId);
      return;
    }

    try {
      console.log('📄 Loading file content from backend for path:', file.path);
      // Load file content from backend
      const content = await apiService.getFileContent(file.path);
      console.log('📄 File content loaded, length:', content?.length || 0);
      const fileWithContent = { ...file, content: content || '', isLoaded: true };
      
      setOpenFiles(prev => [...prev, fileWithContent]);
      setActiveFileId(fileId);
      console.log('📄 File opened successfully');
    } catch (error) {
      console.error('Error loading file content:', error);
      alert('Failed to load file content');
    }
  }, [fileSystemItems, openFiles]);

  // Handle file content changes
  const handleFileChange = useCallback(async (fileId: string, content: string) => {
    console.log('📝 File content changed:', fileId, 'length:', content.length);
    
    setOpenFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, content, isModified: true }
        : file
    ));
  }, []);

  // Handle file save
  const handleFileSave = useCallback(async (fileId: string) => {
    const file = openFiles.find(f => f.id === fileId);
    if (!file) {
      console.error('❌ File not found for saving:', fileId);
      return;
    }

    try {
      console.log('💾 Saving file:', file.path);
      await apiService.saveFileContent(file.path, file.content || '');
      
      setOpenFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, isModified: false }
          : f
      ));
      
      console.log('✅ File saved successfully');
    } catch (error) {
      console.error('❌ Error saving file:', error);
      alert('Failed to save file');
    }
  }, [openFiles]);

  // Auto-save functionality
  const handleAutoSave = useCallback(async (fileId: string) => {
    const file = openFiles.find(f => f.id === fileId);
    if (!file || !file.isModified) return;

    try {
      console.log('🔄 Auto-saving file:', file.path);
      await apiService.saveFileContent(file.path, file.content || '');
      
      setOpenFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, isModified: false }
          : f
      ));
      
      console.log('✅ Auto-save completed');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }, [openFiles]);

  const handleTabClick = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  const handleTabClose = useCallback((fileId: string) => {
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    
    if (fileId === activeFileId) {
      const remainingFiles = openFiles.filter(f => f.id !== fileId);
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0].id);
      } else {
        setActiveFileId(null);
      }
    }
  }, [activeFileId, openFiles]);

  const handleToggleFolder = useCallback(async (folderId: string) => {
    console.log('🔄 Toggling folder:', folderId);
    const folder = fileSystemItems.find(f => f.id === folderId);
    console.log('📁 Found folder:', folder);
    if (!folder || folder.type !== 'folder') {
      console.log('❌ Folder not found or wrong type:', folder?.type);
      return;
    }

    try {
      const folderItem = folder as FolderItem;
      console.log('📁 Folder item:', folderItem);
      if (!folderItem.isExpanded) {
        // Load folder contents from backend
        console.log('📂 Loading contents for folder path:', folder.path);
        const files = await apiService.listFiles(folder.path);
        console.log('📂 Files in folder:', files);
        const children: FileSystemItem[] = files.map((file: BackendFileInfo) => {
          if (file.isDirectory) {
            return {
              id: file.path,
              name: file.name,
              path: file.path,
              type: 'folder' as const,
              children: [],
              isExpanded: false
            };
          } else {
            return {
              id: file.path,
              name: file.name,
              path: file.path,
              type: 'file' as const,
              content: '',
              language: getFileLanguage(file.name),
              isModified: false,
              isLoaded: false
            };
          }
        });

        setFileSystemItems(prev => prev.map(f => 
          f.id === folderId ? { ...f, children, isExpanded: true } : f
        ));
      } else {
        // Collapse folder
        setFileSystemItems(prev => prev.map(f => 
          f.id === folderId ? { ...f, isExpanded: false } : f
        ));
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
    }
  }, [fileSystemItems]);

  const handleEditorChange = useCallback((content: string) => {
    if (activeFileId) {
      setOpenFiles(prev => prev.map(f => 
        f.id === activeFileId ? { ...f, content, isModified: true } : f
      ));
      
      // Auto-save after a delay
      const timeoutId = setTimeout(() => {
        handleAutoSave(activeFileId);
      }, 2000); // Auto-save after 2 seconds of inactivity
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeFileId, handleAutoSave]);

  const handleSaveFile = useCallback(async (fileId?: string) => {
    const targetFileId = fileId || activeFileId;
    if (!targetFileId) return;

    const file = openFiles.find(f => f.id === targetFileId);
    if (!file) return;

    try {
      await apiService.saveFileContent(file.path, file.content || '');
      
      setOpenFiles(prev => prev.map(f => 
        f.id === targetFileId ? { ...f, isModified: false } : f
      ));
      
      console.log('File saved:', targetFileId);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file');
    }
  }, [activeFileId, openFiles]);

  const handleDeleteFile = useCallback(async (fileId: string) => {
    const file = fileSystemItems.find(f => f.id === fileId);
    if (!file) return;

    try {
      await apiService.deleteFile(file.path);
      
      setFileSystemItems(prev => prev.filter(f => f.id !== fileId));
      setOpenFiles(prev => prev.filter(f => f.id !== fileId));
      
      if (fileId === activeFileId) {
        const remainingFiles = openFiles.filter(f => f.id !== fileId);
        if (remainingFiles.length > 0) {
          setActiveFileId(remainingFiles[0].id);
        } else {
          setActiveFileId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  }, [fileSystemItems, activeFileId, openFiles]);

  const handleRenameFile = useCallback(async (fileId: string, newName: string) => {
    const file = fileSystemItems.find(f => f.id === fileId);
    if (!file) return;

    try {
      const newPath = file.path.replace(file.name, newName);
      await apiService.renameFile(file.path, newPath);
      
      // Reload file system
      await loadFileSystem(currentPath);
    } catch (error) {
      console.error('Error renaming file:', error);
      alert('Failed to rename file');
    }
  }, [fileSystemItems, currentPath]);

  const handleOpenInTerminal = useCallback((path: string) => {
    // This will be handled by the terminal component
    console.log('Opening terminal at path:', path);
  }, []);

  // Set up keyboard shortcuts
  useEffect(() => {
    const shortcuts = createDefaultShortcuts(
      () => handleSaveFile(),
      () => handleNewFile(),
      () => (document.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement)?.click(),
      () => setIsSearchOpen(true),
      () => console.log('Run code'),
      () => console.log('Debug code'),
      () => setIsSettingsOpen(true)
    );

    shortcuts.forEach(shortcut => {
      shortcutManager.addShortcut(shortcut);
    });

    return () => {
      shortcuts.forEach(shortcut => {
        shortcutManager.removeShortcut(shortcut);
      });
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-editor-bg text-editor-text overflow-hidden flex flex-col">
      {/* Top Menu Bar */}
      <MenuBar
        onNewFile={handleNewFile}
        onOpenFile={() => (document.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement)?.click()}
        onOpenFolder={() => (document.querySelector('input[type="file"][webkitdirectory]') as HTMLInputElement)?.click()}
        onSaveFile={() => handleSaveFile()}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      {/* Backend Status Bar */}
      <div className="px-4 py-1 bg-editor-border border-b border-editor-border">
        <BackendStatus />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Sidebar */}
          <Panel defaultSize={20} minSize={15} maxSize={35} className="min-w-64">
            <Sidebar
              fileSystemItems={fileSystemItems}
              activeFileId={activeFileId}
              onFileSelect={handleFileSelect}
              onNewFile={handleNewFile}
              onOpenFile={handleOpenFiles}
              onOpenFolder={handleOpenFolder}
              onToggleFolder={handleToggleFolder}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              onOpenInTerminal={handleOpenInTerminal}
              className="h-full"
            />
          </Panel>

          {/* Resize handle */}
          <PanelResizeHandle className="w-1 bg-editor-border hover:bg-editor-accent transition-colors" />

          {/* Main editor area */}
          <Panel defaultSize={55} minSize={35}>
            <PanelGroup direction="vertical">
              {/* Editor area */}
              <Panel defaultSize={70} minSize={30}>
                <div className="h-full flex flex-col">
                  {/* Tab bar */}
                  <TabBar
                    files={openFiles}
                    activeFileId={activeFileId}
                    onTabClick={handleTabClick}
                    onTabClose={handleTabClose}
                    onSaveFile={handleSaveFile}
                    onRunCode={() => console.log('Run code')}
                    onDebugCode={() => console.log('Debug code')}
                    onSearchInFile={() => console.log('Search in file')}
                    onSplitEditor={() => console.log('Split editor')}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                  />

                  {/* Editor */}
                  <div className="flex-1 min-h-0">
                    <Editor
                      file={activeFile}
                      onChange={handleEditorChange}
                      onSave={() => handleSaveFile()}
                    />
                  </div>
                </div>
              </Panel>

              {/* Vertical resize handle */}
              <PanelResizeHandle className="h-1 bg-editor-border hover:bg-editor-accent transition-colors" />

              {/* Terminal */}
              <Panel defaultSize={30} minSize={20} maxSize={50}>
                <EnhancedTerminal 
                  className="h-full" 
                  onOpenInTerminal={handleOpenInTerminal}
                />
              </Panel>
            </PanelGroup>
          </Panel>

          {/* Resize handle */}
          <PanelResizeHandle className="w-1 bg-editor-border hover:bg-editor-accent transition-colors" />

          {/* Agent Workflow UI */}
          <Panel defaultSize={25} minSize={20} maxSize={40}>
            <AgentWorkflowUI
              workflow={null}
              isExecuting={false}
              onCancel={() => {}}
              onRetry={() => {}}
              onSendRequest={() => {}}
              className="h-full"
            />
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar
        activeFile={activeFile}
        totalFiles={openFiles.length}
        modifiedFiles={openFiles.filter(f => f.isModified).length}
      />

      {/* File Search Modal */}
      <FileSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        fileSystemItems={fileSystemItems}
        onFileSelect={handleFileSelect}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <TerminalProvider>
        <AppContent />
      </TerminalProvider>
    </SettingsProvider>
  );
};

export default App; 