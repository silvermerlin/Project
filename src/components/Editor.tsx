import React, { useRef, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { FileItem } from '../utils/fileUtils';
import { debounce } from '../utils';

interface EditorProps {
  file: FileItem | null;
  onChange: (content: string) => void;
  onSave: () => void;
}

const Editor: React.FC<EditorProps> = ({ file, onChange, onSave }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure Monaco editor theme
    monaco.editor.defineTheme('cursor-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#cccccc',
        'editor.lineHighlightBackground': '#2d2d30',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorCursor.foreground': '#ffffff',
        'editorWhitespace.foreground': '#3e3e42',
        'editorIndentGuide.background': '#3e3e42',
        'editorIndentGuide.activeBackground': '#707070',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#ffffff',
        'scrollbarSlider.background': '#3e3e42',
        'scrollbarSlider.hoverBackground': '#4e4e52',
        'scrollbarSlider.activeBackground': '#5e5e62',
      }
    });

    // Set theme
    monaco.editor.setTheme('cursor-dark');

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      lineHeight: 1.6,
      letterSpacing: 0.5,
      smoothScrolling: true,
      cursorSmoothCaretAnimation: true,
      cursorBlinking: 'smooth',
      renderLineHighlight: 'gutter',
      minimap: {
        enabled: true,
        scale: 1,
        showSlider: 'always',
      },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true,
      },
      guides: {
        bracketPairs: true,
        bracketPairsHorizontal: true,
        highlightActiveBracketPair: true,
        indentation: true,
        highlightActiveIndentation: true,
      },
      suggest: {
        enabled: true,
        showKeywords: true,
        showSnippets: true,
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        showModules: true,
        showReferences: true,
        showIcons: true,
        showTypeParameters: true,
        showWords: true,
        showColors: true,
        showFiles: true,
        showFolders: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showEvents: true,
        showFields: true,
        showInterfaces: true,
        showIssues: true,
        showMethods: true,
        showOperators: true,
        showProperties: true,
        showStructs: true,
        showUnits: true,
        showValues: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
      parameterHints: {
        enabled: true,
        cycle: true,
      },
      formatOnType: true,
      formatOnPaste: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoSurround: 'languageDefined',
      matchBrackets: 'always',
      occurrencesHighlight: true,
      selectionHighlight: true,
      codeLens: true,
      colorDecorators: true,
      lightbulb: {
        enabled: true,
      },
      hover: {
        enabled: true,
        delay: 300,
        sticky: true,
      },
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    // Add focus event listener
    editor.onDidFocusEditorText(() => {
      // Editor is focused
    });

    // Add blur event listener
    editor.onDidBlurEditorText(() => {
      // Editor lost focus
    });
  };

  const debouncedOnChange = debounce((value: string) => {
    onChange(value);
  }, 300);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      debouncedOnChange(value);
    }
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-editor-bg">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-editor-text mb-2">Welcome to AI Code Editor</h2>
          <p className="text-editor-text-secondary">Open a file to start coding</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-editor-bg">
      <MonacoEditor
        height="100%"
        language={file.language}
        value={file.content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          theme: 'cursor-dark',
          automaticLayout: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-editor-bg">
            <div className="text-editor-text-secondary">Loading editor...</div>
          </div>
        }
      />
    </div>
  );
};

export default Editor; 