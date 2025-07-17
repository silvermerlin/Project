import React, { useRef, useEffect, useState, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { FileItem } from '../utils/fileUtils';
import { debounce } from '../utils';
import { useSettings } from '../contexts/SettingsContext';
import { createOllamaService } from '../services/ollamaService';

interface EditorProps {
  file: FileItem | null;
  onChange: (content: string) => void;
  onSave: () => void;
}

const Editor: React.FC<EditorProps> = ({ file, onChange, onSave }) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const { settings } = useSettings();
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
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

    // Add Ctrl+K for AI code generation
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      setShowAIPrompt(true);
    });

    // Add Ctrl+L for AI chat
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
      // This will be handled by the parent component
      window.dispatchEvent(new CustomEvent('open-ai-chat'));
    });

    // Add Ctrl+Space for AI completion
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      handleAICodeCompletion();
    });

    // Add Ctrl+Shift+A for AI code analysis
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA, () => {
      handleAICodeAnalysis();
    });

    // Add Ctrl+Shift+R for AI refactoring
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR, () => {
      handleAIRefactoring();
    });

    // Add focus event listener
    editor.onDidFocusEditorText(() => {
      // Editor is focused
    });

    // Add blur event listener
    editor.onDidBlurEditorText(() => {
      // Editor lost focus
    });

    // Add AI completion provider
    const aiCompletionProvider = {
      provideCompletionItems: async (model: any, position: any) => {
        try {
          const activeModel = settings.ai.models.find(m => m.isEnabled);
          if (!activeModel) return { suggestions: [] };

          const aiService = createOllamaService(activeModel);
          const lineContent = model.getLineContent(position.lineNumber);
          const wordUntilPosition = model.getWordUntilPosition(position);
          
          const prompt = `Complete the following ${file?.language || 'code'} at the cursor position. Only provide the completion, no explanations:

${lineContent.substring(0, wordUntilPosition.endColumn - 1)}[CURSOR]${lineContent.substring(wordUntilPosition.endColumn - 1)}

Completion:`;

          const response = await aiService.generateResponse(
            prompt,
            undefined,
            0.3, // Lower temperature for completions
            100  // Shorter completions
          );

          const suggestions = response.content
            .split('\n')
            .filter(line => line.trim())
            .map((line, index) => ({
              label: line.trim(),
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: line.trim(),
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: wordUntilPosition.endColumn,
                endColumn: wordUntilPosition.endColumn,
              },
              sortText: String(index).padStart(5, '0'),
            }));

          return { suggestions };
        } catch (error) {
          console.error('AI completion error:', error);
          return { suggestions: [] };
        }
      }
    };

    monaco.languages.registerCompletionItemProvider('*', aiCompletionProvider);
  };

  const handleAICodeCompletion = useCallback(async () => {
    if (!editorRef.current || !file) return;

    const selection = editorRef.current.getSelection();
    const selectedText = editorRef.current.getModel().getValueInRange(selection);
    
    if (!selectedText.trim()) return;

    setIsAILoading(true);
    try {
      const activeModel = settings.ai.models.find(m => m.isEnabled);
      if (!activeModel) {
        throw new Error('No AI model configured');
      }

      const aiService = createOllamaService(activeModel);
      const prompt = `Complete or improve this ${file.language} code. Provide only the improved code, no explanations:

${selectedText}

Improved code:`;

      const response = await aiService.generateResponse(
        prompt,
        undefined,
        0.5,
        500
      );

      // Replace the selected text with AI completion
      editorRef.current.executeEdits('ai-completion', [{
        range: selection,
        text: response.content
      }]);

    } catch (error) {
      console.error('AI completion error:', error);
    } finally {
      setIsAILoading(false);
    }
  }, [file, settings]);

  const handleAICodeAnalysis = useCallback(async () => {
    if (!editorRef.current || !file) return;

    setIsAILoading(true);
    try {
      const activeModel = settings.ai.models.find(m => m.isEnabled);
      if (!activeModel) {
        throw new Error('No AI model configured');
      }

      const aiService = createOllamaService(activeModel);
      const code = editorRef.current.getValue();
      
      const prompt = `Analyze this ${file.language} code and provide a detailed analysis including:

1. Code quality assessment
2. Potential bugs or issues
3. Performance considerations
4. Security concerns (if applicable)
5. Best practices suggestions
6. Refactoring recommendations

Code to analyze:
${code}

Provide a structured analysis:`;

      const response = await aiService.generateResponse(
        prompt,
        undefined,
        0.7,
        1000
      );

      setAiAnalysis({
        code: code,
        analysis: response.content,
        timestamp: new Date()
      });
      setShowAIAnalysis(true);

    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setIsAILoading(false);
    }
  }, [file, settings]);

  const handleAIRefactoring = useCallback(async () => {
    if (!editorRef.current || !file) return;

    const selection = editorRef.current.getSelection();
    const selectedText = editorRef.current.getModel().getValueInRange(selection);
    
    if (!selectedText.trim()) {
      // If no selection, refactor the entire file
      const fullCode = editorRef.current.getValue();
      if (!fullCode.trim()) return;
      
      setIsAILoading(true);
      try {
        const activeModel = settings.ai.models.find(m => m.isEnabled);
        if (!activeModel) {
          throw new Error('No AI model configured');
        }

        const aiService = createOllamaService(activeModel);
        const prompt = `Refactor this ${file.language} code to improve readability, maintainability, and follow best practices. Provide only the refactored code, no explanations:

${fullCode}

Refactored code:`;

        const response = await aiService.generateResponse(
          prompt,
          undefined,
          0.6,
          2000
        );

        // Replace the entire file content
        const fullRange = {
          startLineNumber: 1,
          endLineNumber: editorRef.current.getModel().getLineCount(),
          startColumn: 1,
          endColumn: editorRef.current.getModel().getLineMaxColumn(editorRef.current.getModel().getLineCount())
        };

        editorRef.current.executeEdits('ai-refactoring', [{
          range: fullRange,
          text: response.content
        }]);

      } catch (error) {
        console.error('AI refactoring error:', error);
      } finally {
        setIsAILoading(false);
      }
    } else {
      // Refactor selected text
      setIsAILoading(true);
      try {
        const activeModel = settings.ai.models.find(m => m.isEnabled);
        if (!activeModel) {
          throw new Error('No AI model configured');
        }

        const aiService = createOllamaService(activeModel);
        const prompt = `Refactor this ${file.language} code to improve readability and maintainability. Provide only the refactored code, no explanations:

${selectedText}

Refactored code:`;

        const response = await aiService.generateResponse(
          prompt,
          undefined,
          0.6,
          1000
        );

        // Replace the selected text with refactored code
        editorRef.current.executeEdits('ai-refactoring', [{
          range: selection,
          text: response.content
        }]);

      } catch (error) {
        console.error('AI refactoring error:', error);
      } finally {
        setIsAILoading(false);
      }
    }
  }, [file, settings]);

  const handleAICodeGeneration = useCallback(async () => {
    if (!aiPrompt.trim() || !editorRef.current || !file) return;

    setIsAILoading(true);
    try {
      const activeModel = settings.ai.models.find(m => m.isEnabled);
      if (!activeModel) {
        throw new Error('No AI model configured');
      }

      const aiService = createOllamaService(activeModel);
      const systemPrompt = `You are an expert ${file.language} developer. Generate code based on the user's request. Provide only the code, no explanations or markdown formatting.`;

      const response = await aiService.generateResponse(
        aiPrompt,
        systemPrompt,
        0.7,
        1000
      );

      // Insert the generated code at cursor position
      const position = editorRef.current.getPosition();
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column,
        endColumn: position.column,
      };

      editorRef.current.executeEdits('ai-generation', [{
        range,
        text: response.content
      }]);

      setShowAIPrompt(false);
      setAiPrompt('');

    } catch (error) {
      console.error('AI generation error:', error);
    } finally {
      setIsAILoading(false);
    }
  }, [aiPrompt, file, settings]);

  const debouncedOnChange = debounce((value: string) => {
    onChange(value);
  }, 300);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      debouncedOnChange(value);
    }
  };

  console.log('🎯 Editor render - file:', file ? { id: file.id, name: file.name, contentLength: file.content?.length || 0 } : null);
  
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-editor-bg">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-editor-text mb-2">Welcome to AI Code Editor</h2>
          <p className="text-editor-text-secondary">Open a file to start coding</p>
          <div className="mt-4 text-sm text-editor-text-secondary space-y-1">
            <p>• Press Ctrl+K to generate code with AI</p>
            <p>• Press Ctrl+L to open AI chat</p>
            <p>• Press Ctrl+Space for AI code completion</p>
            <p>• Press Ctrl+Shift+A for AI code analysis</p>
            <p>• Press Ctrl+Shift+R for AI refactoring</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-editor-bg relative">
      {/* AI Prompt Modal */}
      {showAIPrompt && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-editor-tab border border-editor-border rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-medium text-editor-text mb-4">AI Code Generation</h3>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe what code you want to generate..."
              className="w-full h-32 bg-editor-bg border border-editor-border rounded p-3 text-editor-text resize-none focus:outline-none focus:border-editor-accent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleAICodeGeneration();
                }
                if (e.key === 'Escape') {
                  setShowAIPrompt(false);
                  setAiPrompt('');
                }
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAICodeGeneration}
                disabled={!aiPrompt.trim() || isAILoading}
                className="px-4 py-2 bg-editor-accent hover:bg-editor-accent-hover text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAILoading ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={() => {
                  setShowAIPrompt(false);
                  setAiPrompt('');
                }}
                className="px-4 py-2 bg-editor-tab border border-editor-border text-editor-text rounded hover:bg-editor-border"
              >
                Cancel
              </button>
            </div>
            <div className="text-xs text-editor-text-secondary mt-2">
              Press Ctrl+Enter to generate, Escape to cancel
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {showAIAnalysis && aiAnalysis && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-editor-tab border border-editor-border rounded-lg p-6 w-[800px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-editor-text">AI Code Analysis</h3>
              <button
                onClick={() => setShowAIAnalysis(false)}
                className="text-editor-text-secondary hover:text-editor-text"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="bg-editor-bg border border-editor-border rounded p-4 mb-4">
                <h4 className="text-sm font-medium text-editor-text mb-2">Analysis Results</h4>
                <div className="text-sm text-editor-text whitespace-pre-wrap">
                  {aiAnalysis.analysis}
                </div>
              </div>
              <div className="text-xs text-editor-text-secondary">
                Analyzed at: {aiAnalysis.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Loading Overlay */}
      {isAILoading && (
        <div className="absolute top-4 right-4 bg-editor-accent text-white px-3 py-1 rounded text-sm z-10">
          AI is working...
        </div>
      )}

      <MonacoEditor
        height="100%"
        language={file.language}
        value={file.content || ''}
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