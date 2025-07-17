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
import { 
  FileItem, 
  FolderItem, 
  FileSystemItem, 
  createNewFile, 
  readFileFromInput, 
  readDirectoryFromInput, 
  loadFileContent,
  downloadFile, 
  getAllFiles,
  findFileById,
  updateFileInTree,
  removeFileFromTree,
  toggleFolderExpansion
} from './utils/fileUtils';

const AppContent: React.FC = () => {
  const { settings } = useSettings();
  const { getHistory, executeCommand } = useTerminal();
  
  // Simple state management
  const [fileSystemItems, setFileSystemItems] = useState<FileSystemItem[]>([]);
  const [openFiles, setOpenFiles] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get active file
  const activeFile = openFiles.find(f => f.id === activeFileId) || null;

  // File operations
  const handleNewFile = useCallback((parentFolderId?: string) => {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      const newFile = createNewFile(fileName, parentFolderId);
      setFileSystemItems(prev => [...prev, newFile]);
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
    }
  }, []);

  const handleOpenFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileItem[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const fileItem = await readFileFromInput(file);
        newFiles.push(fileItem);
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }
    
    if (newFiles.length > 0) {
      setFileSystemItems(prev => [...prev, ...newFiles]);
      setOpenFiles(prev => [...prev, ...newFiles]);
      setActiveFileId(newFiles[0].id);
    }
  }, []);

  const handleOpenFolder = useCallback(async (fileList: FileList) => {
    try {
      const folderStructure = await readDirectoryFromInput(fileList);
      setFileSystemItems(prev => [...prev, folderStructure]);
      console.log('Folder loaded successfully. Click on files to open them.');
    } catch (error) {
      console.error('Error reading folder:', error);
    }
  }, []);

  const handleFileSelect = useCallback(async (fileId: string) => {
    const file = findFileById(fileSystemItems, fileId);
    if (file && file.type === 'file') {
      // Check if file is already open
      const isAlreadyOpen = openFiles.some(f => f.id === fileId);
      
      if (!isAlreadyOpen) {
        // Load file content if needed
        let fileToOpen = file;
        if (!file.isLoaded && file.file) {
          try {
            fileToOpen = await loadFileContent(file);
            setFileSystemItems(prev => updateFileInTree(prev, fileId, fileToOpen));
          } catch (error) {
            console.error('Error loading file content:', error);
          }
        }
        
        setOpenFiles(prev => [...prev, fileToOpen]);
      }
      
      setActiveFileId(fileId);
    }
  }, [fileSystemItems, openFiles]);

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

  const handleToggleFolder = useCallback((folderId: string) => {
    setFileSystemItems(prev => toggleFolderExpansion(prev, folderId));
  }, []);

  const handleEditorChange = useCallback((content: string) => {
    if (activeFileId) {
      setOpenFiles(prev => prev.map(f => 
        f.id === activeFileId ? { ...f, content, isModified: true } : f
      ));
      setFileSystemItems(prev => updateFileInTree(prev, activeFileId, { content, isModified: true }));
    }
  }, [activeFileId]);

  const handleSaveFile = useCallback((fileId?: string) => {
    const targetFileId = fileId || activeFileId;
    if (targetFileId) {
      setOpenFiles(prev => prev.map(f => 
        f.id === targetFileId ? { ...f, isModified: false } : f
      ));
      setFileSystemItems(prev => updateFileInTree(prev, targetFileId, { isModified: false }));
      console.log('File saved:', targetFileId);
    }
  }, [activeFileId]);

  const handleDownloadFile = useCallback((fileId: string) => {
    const file = findFileById(fileSystemItems, fileId);
    if (file && file.type === 'file') {
      downloadFile(file);
    }
  }, [fileSystemItems]);

  const handleDeleteFile = useCallback((fileId: string) => {
    setFileSystemItems(prev => removeFileFromTree(prev, fileId));
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    
    if (fileId === activeFileId) {
      const remainingFiles = openFiles.filter(f => f.id !== fileId);
      if (remainingFiles.length > 0) {
        setActiveFileId(remainingFiles[0].id);
      } else {
        setActiveFileId(null);
      }
    }
  }, [fileSystemItems, activeFileId, openFiles]);

  const handleRenameFile = useCallback((fileId: string, newName: string) => {
    setFileSystemItems(prev => updateFileInTree(prev, fileId, { name: newName }));
    setOpenFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, name: newName } : f
    ));
  }, []);

  const handleOpenInTerminal = useCallback((path: string) => {
    // This will be integrated with the terminal system
    console.log('Opening terminal at path:', path);
    // The terminal component will handle the CWD change internally
  }, []);

  return (
    <div className="h-screen w-screen bg-editor-bg text-editor-text overflow-hidden flex flex-col">
      {/* Top Menu Bar */}
      <MenuBar
        onNewFile={handleNewFile}
        onOpenFile={() => document.querySelector('input[type="file"]:not([webkitdirectory])')?.click()}
        onOpenFolder={() => document.querySelector('input[type="file"][webkitdirectory]')?.click()}
        onSaveFile={() => handleSaveFile()}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
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
              onDownloadFile={handleDownloadFile}
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