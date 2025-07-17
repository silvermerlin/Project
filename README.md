# AI Code Editor

A modern, responsive code editor built with React, TypeScript, and Monaco Editor. This project aims to create a Cursor-like experience with AI-focused features, including folder support, AI chat, and integrated terminal.

## Features

### 📝 **Core Editor Features**
- ✨ **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- 🎨 **Modern Dark Theme**: Cursor-inspired dark theme with smooth animations
- 📱 **Responsive Design**: Fully responsive with resizable panels
- ⌨️ **Keyboard Shortcuts**: Common shortcuts for enhanced productivity

### 📁 **File & Folder Management**
- 📂 **Folder Support**: Open entire folders/projects with folder tree navigation
- 📄 **File Operations**: Create, open, edit, and save files
- 🌳 **Folder Tree**: Expandable folder structure with file icons
- 🏷️ **Tab System**: Multiple file tabs with close and save functionality
- 💾 **Auto-persistence**: Automatic state saving to localStorage

### 🤖 **AI Features**
- 💬 **AI Chat Panel**: Standalone AI assistant chat interface (right panel)
- 🎯 **Code-focused**: Designed for code-related queries and assistance
- 📋 **Copy Support**: Copy AI responses with one click
- ⏱️ **Real-time**: Simulated AI responses with typing indicators

### 🖥️ **Terminal Integration**
- 🖥️ **Built-in Terminal**: Integrated terminal at the bottom
- 📜 **Command History**: Arrow keys for command navigation
- 🎨 **Syntax Highlighting**: Colored output for commands and errors
- 📋 **Terminal Actions**: Copy content and clear terminal

### 🔍 **Language Support**
- Support for 25+ programming languages with syntax highlighting
- Automatic language detection from file extensions
- Custom file icons for different languages

## Layout

The editor features a **three-panel layout** similar to Cursor:

```
┌─────────────┬───────────────────────────┬─────────────┐
│   Sidebar   │     Main Editor Area      │  AI Chat    │
│             │  ┌─────────────────────┐  │             │
│ • Explorer  │  │    Tab Bar          │  │ • Messages  │
│ • Files     │  │                     │  │ • Input     │
│ • Folders   │  │    Monaco Editor    │  │ • Copy      │
│ • Actions   │  │                     │  │             │
│             │  ├─────────────────────┤  │             │
│             │  │    Terminal         │  │             │
│             │  │                     │  │             │
└─────────────┴─────────────────────────┴─────────────┘
```

## Keyboard Shortcuts

- `Ctrl/Cmd + N` - New file
- `Ctrl/Cmd + O` - Open file
- `Ctrl/Cmd + S` - Save current file
- `Ctrl/Cmd + W` - Close current tab
- `Ctrl/Cmd + Tab` - Switch to next tab
- `Enter` - Send AI chat message
- `Shift + Enter` - New line in AI chat
- `Up/Down arrows` - Navigate terminal history

## Getting Started

1. **Install dependencies:**
```bash
npm install
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser and navigate to:** `http://localhost:3000`

## Usage

### Opening Files and Folders

1. **Single Files**: Click "File" in the sidebar to open individual files
2. **Entire Folders**: Click "Folder" to open complete project folders
3. **Create New**: Click "New" to create new files
4. **Drag & Drop**: (Coming soon) Drag files/folders directly into the editor

### Using the AI Chat

1. **Ask Questions**: Type code-related questions in the chat input
2. **Get Assistance**: The AI can help with debugging, explanations, and coding tasks
3. **Copy Responses**: Click the copy icon to copy AI responses
4. **Context Aware**: The AI is designed to understand your coding context

### Terminal Commands

The terminal supports common commands:
- `help` - Show available commands
- `ls` / `dir` - List directory contents
- `pwd` - Show current directory
- `clear` - Clear terminal
- `git status` - Show git status
- `npm run dev` - Start development server
- And many more...

## Supported Languages

The editor supports syntax highlighting for:
- **Web**: HTML, CSS, JavaScript, TypeScript, JSX, TSX
- **Styling**: SCSS, SASS, Less
- **Backend**: Python, Java, C/C++, C#, PHP, Ruby, Go, Rust
- **Mobile**: Swift, Kotlin, Dart
- **Data**: JSON, XML, YAML, SQL
- **Documentation**: Markdown
- **Configuration**: Dockerfile, Shell scripts
- **Frameworks**: Vue, Svelte, React

## Project Structure

```
src/
├── components/          # React components
│   ├── Editor.tsx      # Monaco editor wrapper
│   ├── Sidebar.tsx     # File explorer and folder tree
│   ├── TabBar.tsx      # Tab management system
│   ├── AIChat.tsx      # AI chat interface
│   └── Terminal.tsx    # Terminal component
├── utils/              # Utility functions
│   ├── fileUtils.ts    # File and folder operations
│   └── index.ts        # Common utilities
├── types/              # TypeScript declarations
│   └── global.d.ts     # Global type extensions
├── App.tsx             # Main application with layout
├── main.tsx            # Application entry point
└── index.css           # Global styles and theme
```

## Technology Stack

- **React 18** - UI library with hooks
- **TypeScript** - Type safety and better development experience
- **Vite** - Lightning-fast build tool and dev server
- **Monaco Editor** - VS Code's editor engine
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **React Resizable Panels** - Smooth resizable layout system

## Architecture Highlights

- **Modular Design**: Clean separation of concerns
- **Type Safety**: Full TypeScript coverage
- **State Management**: Efficient React state with hooks
- **File System**: Hierarchical folder structure support
- **Persistence**: Local storage for state preservation
- **Responsive**: Adaptive layout for all screen sizes

## Future Enhancements

### Phase 2: AI Integration
- 🤖 Real AI API integration (OpenAI, Claude, etc.)
- 💡 Code suggestions and autocompletion
- 🔍 Intelligent code analysis and refactoring
- 🗣️ Voice commands and dictation

### Phase 3: Advanced Features
- 🌐 Real-time collaboration
- 🔌 Plugin system and extensions
- 📊 Git integration with visual diff
- 🎨 Multiple themes and customization
- 🚀 Code execution and debugging
- 📱 Mobile app version

### Phase 4: Enterprise Features
- 👥 Team workspaces
- 🔐 Advanced authentication
- ☁️ Cloud synchronization
- 📈 Usage analytics
- 🛡️ Security features

## Contributing

This project is designed to be the foundation for a modern AI-powered code editor. Contributions are welcome in:

1. **Core Features**: Improving existing functionality
2. **AI Integration**: Adding real AI capabilities
3. **UI/UX**: Enhancing the user experience
4. **Performance**: Optimizing for speed and efficiency
5. **Testing**: Adding comprehensive tests
6. **Documentation**: Improving docs and examples

## License

MIT License

---

**Note**: This is the first phase of an AI-focused code editor. The AI chat currently uses simulated responses for demonstration. In future phases, it will integrate with real AI APIs to provide intelligent code assistance. 