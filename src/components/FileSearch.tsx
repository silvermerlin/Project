import React, { useState, useRef, useEffect } from 'react';
import { Search, X, FileText, Folder, ArrowUp, ArrowDown } from 'lucide-react';
import { FileSystemItem } from '../utils/fileUtils';
import { cn } from '../utils';

interface FileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  fileSystemItems: FileSystemItem[];
  onFileSelect: (fileId: string) => void;
  className?: string;
}

interface SearchResult {
  file: FileSystemItem;
  matches: Array<{
    line: number;
    content: string;
    preview: string;
  }>;
  score: number;
}

const FileSearch: React.FC<FileSearchProps> = ({
  isOpen,
  onClose,
  fileSystemItems,
  onFileSelect,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'files' | 'content'>('files');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : searchResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            onFileSelect(searchResults[selectedIndex].file.id);
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose, onFileSelect]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      const results = performSearch(searchQuery, fileSystemItems, searchType);
      setSearchResults(results);
      setSelectedIndex(0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, fileSystemItems, searchType]);

  const performSearch = (
    query: string, 
    items: FileSystemItem[], 
    type: 'files' | 'content'
  ): SearchResult[] => {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    const searchInItems = (items: FileSystemItem[], path: string = ''): void => {
      items.forEach(item => {
        const itemPath = path ? `${path}/${item.name}` : item.name;
        
        // Search in file names
        if (item.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            file: item,
            matches: [{
              line: 0,
              content: item.name,
              preview: `File: ${itemPath}`
            }],
            score: calculateScore(item.name, lowerQuery)
          });
        }

        // Search in file content
        if (type === 'content' && item.type === 'file' && item.content) {
          const content = item.content;
          const lines = content.split('\n');
          const matches: Array<{ line: number; content: string; preview: string }> = [];

          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(lowerQuery)) {
              const lineNumber = index + 1;
              const preview = line.trim().substring(0, 100);
              matches.push({
                line: lineNumber,
                content: line,
                preview: `Line ${lineNumber}: ${preview}`
              });
            }
          });

          if (matches.length > 0) {
            results.push({
              file: item,
              matches,
              score: calculateScore(item.name, lowerQuery) + matches.length
            });
          }
        }

        // Search in subdirectories
        if (item.type === 'folder' && item.children) {
          searchInItems(item.children, itemPath);
        }
      });
    };

    searchInItems(items);
    
    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  };

  const calculateScore = (text: string, query: string): number => {
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(query);
    
    // Higher score for matches at the beginning
    if (index === 0) return 100;
    if (index > 0) return 50;
    return 0;
  };

  const getFileIcon = (item: FileSystemItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-4 h-4 text-editor-accent" />;
    }
    return <FileText className="w-4 h-4 text-editor-text-secondary" />;
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50",
      className
    )}>
      <div className="bg-editor-sidebar border border-editor-border rounded-lg shadow-lg w-full max-w-2xl mx-4">
        {/* Search header */}
        <div className="flex items-center gap-3 p-4 border-b border-editor-border">
          <Search className="w-5 h-5 text-editor-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files and content..."
            className="flex-1 bg-transparent text-editor-text placeholder-editor-text-secondary outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-editor-border transition-colors"
          >
            <X className="w-4 h-4 text-editor-text-secondary" />
          </button>
        </div>

        {/* Search type toggle */}
        <div className="flex items-center gap-2 p-2 border-b border-editor-border">
          <button
            onClick={() => setSearchType('files')}
            className={cn(
              "px-3 py-1 rounded text-sm transition-colors",
              searchType === 'files'
                ? "bg-editor-accent text-white"
                : "text-editor-text-secondary hover:bg-editor-border"
            )}
          >
            Files
          </button>
          <button
            onClick={() => setSearchType('content')}
            className={cn(
              "px-3 py-1 rounded text-sm transition-colors",
              searchType === 'content'
                ? "bg-editor-accent text-white"
                : "text-editor-text-secondary hover:bg-editor-border"
            )}
          >
            Content
          </button>
        </div>

        {/* Search results */}
        <div className="max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-editor-text-secondary">
              Searching...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center text-editor-text-secondary">
              {searchQuery ? 'No results found' : 'Start typing to search...'}
            </div>
          ) : (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <div
                  key={`${result.file.id}-${index}`}
                  className={cn(
                    "flex items-start gap-3 p-3 cursor-pointer transition-colors",
                    selectedIndex === index
                      ? "bg-editor-accent bg-opacity-20"
                      : "hover:bg-editor-border"
                  )}
                  onClick={() => {
                    onFileSelect(result.file.id);
                    onClose();
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getFileIcon(result.file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-editor-text truncate">
                        {result.file.name}
                      </span>
                      <span className="text-xs text-editor-text-secondary">
                        {result.file.path}
                      </span>
                    </div>
                    {result.matches.map((match, matchIndex) => (
                      <div key={matchIndex} className="text-sm text-editor-text-secondary">
                        {match.preview}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search info */}
        <div className="flex items-center justify-between p-3 border-t border-editor-border text-xs text-editor-text-secondary">
          <div className="flex items-center gap-4">
            <span>{searchResults.length} results</span>
            <span>Searching in {searchType}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>Enter Open</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSearch; 