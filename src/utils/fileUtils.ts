export interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
  path: string;
  isModified: boolean;
  type: 'file';
  file?: File; // Store the original File object for lazy loading
  isLoaded: boolean; // Track if content has been loaded
}

export interface FolderItem {
  id: string;
  name: string;
  path: string;
  type: 'folder';
  children: (FileItem | FolderItem)[];
  isExpanded: boolean;
}

export type FileSystemItem = FileItem | FolderItem;

export const getFileLanguage = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    'dockerfile': 'dockerfile',
    'gitignore': 'gitignore',
    'vue': 'vue',
    'svelte': 'svelte',
  };

  return languageMap[extension || ''] || 'plaintext';
};

export const generateFileId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const createNewFile = (name: string, parentFolderId?: string, content: string = ''): FileItem => {
  const path = parentFolderId ? `folder-${parentFolderId}/${name}` : name;
  return {
    id: generateFileId(),
    name,
    content,
    language: getFileLanguage(name),
    path,
    isModified: false,
    type: 'file',
    isLoaded: true,
  };
};

export const createNewFolder = (name: string, path: string = ''): FolderItem => {
  const fullPath = path ? `${path}/${name}` : name;
  return {
    id: generateFileId(),
    name,
    path: fullPath,
    type: 'folder',
    children: [],
    isExpanded: false,
  };
};

export const readFileFromInput = (file: File): Promise<FileItem> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve({
        id: generateFileId(),
        name: file.name,
        content,
        language: getFileLanguage(file.name),
        path: file.name,
        isModified: false,
        type: 'file',
        isLoaded: true,
      });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// New function for lazy loading file content
export const loadFileContent = async (fileItem: FileItem): Promise<FileItem> => {
  if (fileItem.isLoaded || !fileItem.file) {
    return fileItem;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve({
        ...fileItem,
        content,
        isLoaded: true,
      });
    };
    reader.onerror = reject;
    reader.readAsText(fileItem.file!);
  });
};

export const readDirectoryFromInput = async (files: FileList): Promise<FolderItem> => {
  const root: FolderItem = {
    id: generateFileId(),
    name: 'Project',
    path: '',
    type: 'folder',
    children: [],
    isExpanded: true,
  };

  const folderMap = new Map<string, FolderItem>();
  folderMap.set('', root);

  // Sort files to ensure folders are created before their contents
  const sortedFiles = Array.from(files).sort((a, b) => {
    const aPath = a.webkitRelativePath || a.name;
    const bPath = b.webkitRelativePath || b.name;
    return aPath.localeCompare(bPath);
  });

  for (const file of sortedFiles) {
    const relativePath = file.webkitRelativePath || file.name;
    const pathParts = relativePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const folderPath = pathParts.slice(0, -1).join('/');

    // Create folder structure
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

      if (!folderMap.has(currentPath)) {
        const newFolder: FolderItem = {
          id: generateFileId(),
          name: folderName,
          path: currentPath,
          type: 'folder',
          children: [],
          isExpanded: false,
        };

        folderMap.set(currentPath, newFolder);
        const parentFolder = folderMap.get(parentPath);
        if (parentFolder) {
          parentFolder.children.push(newFolder);
        }
      }
    }

    // Add file to its parent folder (lazy loading - don't read content yet)
    try {
      const fileItem: FileItem = {
        id: generateFileId(),
        name: fileName,
        content: '', // Will be loaded when file is opened
        language: getFileLanguage(fileName),
        path: relativePath,
        isModified: false,
        type: 'file',
        file: file, // Store the original File object
        isLoaded: false, // Content not loaded yet
      };
      
      const parentFolder = folderMap.get(folderPath);
      if (parentFolder) {
        parentFolder.children.push(fileItem);
      }
    } catch (error) {
      console.error('Error creating file item:', error);
    }
  }

  return root;
};

export const downloadFile = (file: FileItem): void => {
  const blob = new Blob([file.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const findFileById = (items: FileSystemItem[], id: string): FileItem | null => {
  for (const item of items) {
    if (item.type === 'file' && item.id === id) {
      return item;
    }
    if (item.type === 'folder') {
      const found = findFileById(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const findFolderById = (items: FileSystemItem[], id: string): FolderItem | null => {
  for (const item of items) {
    if (item.type === 'folder' && item.id === id) {
      return item;
    }
    if (item.type === 'folder') {
      const found = findFolderById(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

export const getAllFiles = (items: FileSystemItem[]): FileItem[] => {
  const files: FileItem[] = [];
  
  for (const item of items) {
    if (item.type === 'file') {
      files.push(item);
    } else if (item.type === 'folder') {
      files.push(...getAllFiles(item.children));
    }
  }
  
  return files;
};

export const updateFileInTree = (items: FileSystemItem[], fileId: string, updates: Partial<FileItem>): FileSystemItem[] => {
  return items.map(item => {
    if (item.type === 'file' && item.id === fileId) {
      return { ...item, ...updates };
    }
    if (item.type === 'folder') {
      return {
        ...item,
        children: updateFileInTree(item.children, fileId, updates),
      };
    }
    return item;
  });
};

export const removeFileFromTree = (items: FileSystemItem[], fileId: string): FileSystemItem[] => {
  return items.filter(item => {
    if (item.type === 'file' && item.id === fileId) {
      return false;
    }
    if (item.type === 'folder') {
      return {
        ...item,
        children: removeFileFromTree(item.children, fileId),
      };
    }
    return true;
  }).map(item => {
    if (item.type === 'folder') {
      return {
        ...item,
        children: removeFileFromTree(item.children, fileId),
      };
    }
    return item;
  });
};

export const toggleFolderExpansion = (items: FileSystemItem[], folderId: string): FileSystemItem[] => {
  return items.map(item => {
    if (item.type === 'folder' && item.id === folderId) {
      return { ...item, isExpanded: !item.isExpanded };
    }
    if (item.type === 'folder') {
      return {
        ...item,
        children: toggleFolderExpansion(item.children, folderId),
      };
    }
    return item;
  });
}; 