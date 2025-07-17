import React, { useState, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { TerminalProvider, useTerminal } from './contexts/TerminalContext';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import Editor from './components/Editor';
import AgentWorkflowUI from './components/AgentWorkflowUI';
import TerminalTabs from './components/TerminalTabs';
import SettingsModal from './components/SettingsModal';
import MenuBar from './components/MenuBar';
import { AgentOrchestrator } from './services/agentOrchestrator';
import { AgentWorkflow, AgentTask, AgentAction, AgentContext } from './types/agent';
import { 
  FileItem, 
  FolderItem, 
  FileSystemItem, 
  createNewFile, 
  readFileFromInput, 
  readDirectoryFromInput, 
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
  const [fileSystemItems, setFileSystemItems] = useState<FileSystemItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [orchestrator, setOrchestrator] = useState<AgentOrchestrator | null>(null);
  const [currentWorkflow, setCurrentWorkflow] = useState<AgentWorkflow | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const allFiles = getAllFiles(fileSystemItems);
  const activeFile = findFileById(fileSystemItems, activeFileId || '') || null;

  // Initialize agent orchestrator when settings change
  useEffect(() => {
    const fileSystemCallbacks = {
      createFile: (file: FileItem) => {
        console.log('Agent creating file:', file.name);
        
        // Check if file already exists to prevent duplicates
        setFileSystemItems(prev => {
          const existingFile = prev.find(item => 
            item.type === 'file' && item.name === file.name
          );
          
          if (existingFile) {
            console.log('File already exists, updating content:', file.name);
            return updateFileInTree(prev, existingFile.id, { 
              content: file.content,
              isModified: false 
            });
          } else {
            console.log('Creating new file:', file.name);
            return [...prev, file];
          }
        });
        
        setActiveFileId(file.id); // Open the created file
      },
      modifyFile: (fileId: string, updates: any) => {
        console.log('Agent modifying file:', fileId, updates);
        setFileSystemItems(prev => updateFileInTree(prev, fileId, updates));
      },
      deleteFile: (fileId: string) => {
        console.log('Agent deleting file:', fileId);
        setFileSystemItems(prev => removeFileFromTree(prev, fileId));
      }
    };

    const newOrchestrator = new AgentOrchestrator(
      settings.ai.agents,
      settings.ai.models,
      (workflow) => setCurrentWorkflow(workflow),
      (task) => {
        setCurrentWorkflow(prev => prev ? { ...prev, updatedAt: new Date() } : null);
      },
      (action) => {
        // Handle action updates
        console.log('Action updated:', action);
      },
      executeCommand,
      fileSystemCallbacks
    );
    setOrchestrator(newOrchestrator);
  }, [settings.ai.agents, settings.ai.models, executeCommand]);

  // Load file system from localStorage on mount
  useEffect(() => {
    const savedFileSystem = localStorage.getItem('editor-file-system');
    const savedActiveId = localStorage.getItem('editor-active-file');
    
    if (savedFileSystem) {
      try {
        const parsedFileSystem = JSON.parse(savedFileSystem);
        setFileSystemItems(parsedFileSystem);
        if (savedActiveId) {
          const allFiles = getAllFiles(parsedFileSystem);
          if (allFiles.some(f => f.id === savedActiveId)) {
            setActiveFileId(savedActiveId);
          }
        }
      } catch (error) {
        console.error('Error loading saved file system:', error);
      }
    }
  }, []);

  // Save file system to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('editor-file-system', JSON.stringify(fileSystemItems));
    if (activeFileId) {
      localStorage.setItem('editor-active-file', activeFileId);
    }
  }, [fileSystemItems, activeFileId]);

  const handleNewFile = useCallback(() => {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      const newFile = createNewFile(fileName);
      setFileSystemItems(prev => [...prev, newFile]);
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
      setActiveFileId(newFiles[0].id);
    }
  }, []);

  const handleOpenFolder = useCallback(async (fileList: FileList) => {
    try {
      const folderStructure = await readDirectoryFromInput(fileList);
      setFileSystemItems(prev => [...prev, folderStructure]);
      
      // Auto-select the first file in the folder
      const firstFile = getAllFiles([folderStructure])[0];
      if (firstFile) {
        setActiveFileId(firstFile.id);
      }
    } catch (error) {
      console.error('Error reading folder:', error);
    }
  }, []);

  const handleToggleFolder = useCallback((folderId: string) => {
    setFileSystemItems(prev => toggleFolderExpansion(prev, folderId));
  }, []);

  const handleTabClick = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  const handleTabClose = useCallback((fileId: string) => {
    setFileSystemItems(prev => removeFileFromTree(prev, fileId));
    
    // If closing the active file, switch to another file
    if (fileId === activeFileId) {
      const remainingFiles = getAllFiles(removeFileFromTree(fileSystemItems, fileId));
      if (remainingFiles.length > 0) {
        const currentIndex = allFiles.findIndex(f => f.id === fileId);
        const nextIndex = currentIndex >= remainingFiles.length ? remainingFiles.length - 1 : currentIndex;
        setActiveFileId(remainingFiles[nextIndex].id);
      } else {
        setActiveFileId(null);
      }
    }
  }, [activeFileId, fileSystemItems, allFiles]);

  const handleFileSelect = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  const handleEditorChange = useCallback((content: string) => {
    if (activeFileId) {
      setFileSystemItems(prev => updateFileInTree(prev, activeFileId, { content, isModified: true }));
    }
  }, [activeFileId]);

  const handleSaveFile = useCallback((fileId?: string) => {
    const targetFileId = fileId || activeFileId;
    if (targetFileId) {
      setFileSystemItems(prev => updateFileInTree(prev, targetFileId, { isModified: false }));
      console.log('File saved:', targetFileId);
    }
  }, [activeFileId]);

  const handleDownloadFile = useCallback((fileId: string) => {
    const file = findFileById(fileSystemItems, fileId);
    if (file) {
      downloadFile(file);
    }
  }, [fileSystemItems]);

  const handleAgentRequest = useCallback(async (request: string) => {
    if (!orchestrator) {
      console.error('Agent orchestrator not initialized');
      return;
    }

    setIsExecuting(true);
    
    const context: Partial<AgentContext> = {
      workflowId: `workflow-${Date.now()}`,
      taskId: `task-${Date.now()}`,
      fileSystemItems,
      openFiles: allFiles,
      activeFile,
      terminalHistory: getHistory(),
      projectStructure: fileSystemItems,
      dependencies: [], // TODO: Extract from package.json
      environment: {
        NODE_ENV: 'development',
        EDITOR: 'ai-code-editor',
      },
    };

    try {
      const workflow = await orchestrator.startWorkflow(request, context);
      setCurrentWorkflow(workflow);
    } catch (error) {
      console.error('Agent workflow failed:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [orchestrator, fileSystemItems, allFiles, activeFile]);

  const handleWorkflowCancel = useCallback(() => {
    setIsExecuting(false);
    if (currentWorkflow) {
      setCurrentWorkflow({ ...currentWorkflow, status: 'failed' });
    }
  }, [currentWorkflow]);

  const handleWorkflowRetry = useCallback(() => {
    if (currentWorkflow) {
      handleAgentRequest(currentWorkflow.description);
    }
  }, [currentWorkflow, handleAgentRequest]);

  // Editor action handlers
  const handleRunCode = useCallback(() => {
    if (activeFile) {
      console.log('Running code for file:', activeFile.name);
      // TODO: Implement code execution
    }
  }, [activeFile]);

  const handleDebugCode = useCallback(() => {
    if (activeFile) {
      console.log('Debugging code for file:', activeFile.name);
      // TODO: Implement debugging
    }
  }, [activeFile]);

  const handleSearchInFile = useCallback(() => {
    // TODO: Implement search in file functionality
    console.log('Search in file triggered');
  }, []);

  const handleSplitEditor = useCallback(() => {
    // TODO: Implement split editor functionality
    console.log('Split editor triggered');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            handleNewFile();
            break;
          case 'o':
            e.preventDefault();
            // Trigger file input
            document.querySelector('input[type="file"]')?.click();
            break;
          case 's':
            e.preventDefault();
            handleSaveFile();
            break;
          case 'w':
            e.preventDefault();
            if (activeFileId) {
              handleTabClose(activeFileId);
            }
            break;
          case ',':
            e.preventDefault();
            setIsSettingsOpen(true);
            break;
          case 'Tab':
            e.preventDefault();
            // Switch to next tab
            const currentIndex = allFiles.findIndex(f => f.id === activeFileId);
            const nextIndex = (currentIndex + 1) % allFiles.length;
            if (allFiles[nextIndex]) {
              setActiveFileId(allFiles[nextIndex].id);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allFiles, activeFileId, handleNewFile, handleSaveFile, handleTabClose]);

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
        <Panel
          defaultSize={20}
          minSize={15}
          maxSize={35}
          className="min-w-64"
        >
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
                  files={allFiles}
                  activeFileId={activeFileId}
                  onTabClick={handleTabClick}
                  onTabClose={handleTabClose}
                  onSaveFile={handleSaveFile}
                  onRunCode={handleRunCode}
                  onDebugCode={handleDebugCode}
                  onSearchInFile={handleSearchInFile}
                  onSplitEditor={handleSplitEditor}
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
              <TerminalTabs className="h-full" />
            </Panel>
          </PanelGroup>
        </Panel>

        {/* Resize handle */}
        <PanelResizeHandle className="w-1 bg-editor-border hover:bg-editor-accent transition-colors" />

        {/* Agent Workflow UI */}
        <Panel defaultSize={25} minSize={20} maxSize={40}>
          <AgentWorkflowUI
            workflow={currentWorkflow}
            isExecuting={isExecuting}
            onCancel={handleWorkflowCancel}
            onRetry={handleWorkflowRetry}
            onSendRequest={handleAgentRequest}
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