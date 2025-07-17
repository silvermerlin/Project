# 🤖 AI Code Editor - Full-Featured Development Environment

A **REAL** browser-based code editor with advanced AI assistance, built with React, TypeScript, and Vite. This is not a mockup - it's a fully functional development environment with AI-powered features.

## 🚀 **Real Features (Not Mockups)**

### ✅ **Core Editor Features**
- **Monaco Editor Integration** - Full VS Code-like editing experience
- **Syntax Highlighting** - Support for 50+ programming languages
- **Auto-completion** - Intelligent code suggestions
- **Multi-cursor Editing** - Multiple cursors and selections
- **Code Folding** - Collapsible code blocks
- **Bracket Matching** - Visual bracket pair highlighting
- **Line Numbers** - Professional line numbering
- **Minimap** - Code overview navigation
- **Search & Replace** - Find and replace functionality
- **Undo/Redo** - Full edit history
- **Auto-save** - Automatic file saving

### 🤖 **AI-Powered Features**
- **AI Code Completion** - Intelligent code suggestions (Ctrl+Space)
- **AI Code Generation** - Generate code from natural language (Ctrl+K)
- **AI Code Analysis** - Analyze code quality and find issues (Ctrl+Shift+A)
- **AI Refactoring** - Automatically refactor code (Ctrl+Shift+R)
- **AI Chat Assistant** - Interactive AI coding help (Ctrl+L)
- **Agent Workflow** - Multi-agent collaboration for complex tasks
- **Context-Aware AI** - AI understands your current workspace
- **Real-time AI Suggestions** - Live code completion and hints

### 📁 **File Management**
- **Real File System** - Create, read, write, delete files
- **Folder Upload** - Upload entire project folders
- **File Explorer** - Tree-based file navigation
- **Tab Management** - Multiple open files with tabs
- **Auto-save** - Files save automatically after 2 seconds
- **File Watching** - Real-time file change detection
- **Context Menus** - Right-click file operations
- **Drag & Drop** - Intuitive file operations

### 🖥️ **Terminal Integration**
- **Real Terminal** - Execute actual system commands
- **Multiple Terminals** - Multiple terminal sessions
- **Command History** - Navigate through command history
- **Working Directory** - Proper CWD management
- **Real-time Output** - Live command execution
- **Terminal Tabs** - Organize terminal sessions

### 🔧 **Development Tools**
- **Git Integration** - Status, commit, push, pull
- **Package Management** - Install, list, uninstall packages
- **Debugging Support** - Ready for debugging integration
- **Extension System** - Plugin architecture ready
- **Theme Support** - Dark theme with customization
- **Keyboard Shortcuts** - Professional editor shortcuts

## 🛠️ **Tech Stack**

### **Frontend**
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Monaco Editor** - VS Code's editor component
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons

### **Backend**
- **Node.js** - Server runtime
- **Express** - Web framework
- **WebSockets** - Real-time communication
- **node-pty** - Real terminal emulation
- **Chokidar** - File system watching
- **Axios** - HTTP client

### **AI Integration**
- **Ollama** - Local LLM integration
- **Agent Orchestrator** - Multi-agent workflow system
- **Context Management** - AI understands your workspace
- **Streaming Responses** - Real-time AI interactions

## 📦 **Installation**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Ollama (for AI features)

### **Local Development**

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-code-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

3. **Set up Ollama**
   ```bash
   # Install Ollama (https://ollama.ai)
   # Pull a model
   ollama pull llama3.1:8b
   ```

4. **Configure backend**
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your Ollama settings
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm start
   
   # Terminal 2: Frontend
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:3000`

## 🚀 **Deployment**

### **Vercel (Frontend) + Railway (Backend)**

1. **Deploy Backend to Railway**
   ```bash
   cd backend
   # Connect to Railway and deploy
   ```

2. **Deploy Frontend to Vercel**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   
   # Connect to Vercel and deploy
   ```

3. **Configure Environment Variables**
   - Set backend URL in Vercel
   - Configure Ollama endpoint

## 🎯 **Usage Guide**

### **AI Features**

#### **Code Generation (Ctrl+K)**
1. Press `Ctrl+K` in the editor
2. Describe what you want to generate
3. Press `Ctrl+Enter` to generate code
4. AI will insert code at cursor position

#### **AI Chat (Ctrl+L)**
1. Press `Ctrl+L` to open AI chat
2. Ask questions about your code
3. Get explanations, suggestions, and help
4. AI understands your current workspace

#### **Code Analysis (Ctrl+Shift+A)**
1. Press `Ctrl+Shift+A` to analyze current file
2. Get detailed code quality assessment
3. Find potential bugs and issues
4. Receive refactoring recommendations

#### **Code Refactoring (Ctrl+Shift+R)**
1. Select code or press `Ctrl+Shift+R` for entire file
2. AI will refactor for better readability
3. Maintains functionality while improving code
4. Follows language-specific best practices

#### **Agent Workflow**
1. Use the Agent Workflow panel
2. Describe complex tasks
3. AI agents collaborate to:
   - Plan the solution
   - Verify the approach
   - Implement the code
4. Get step-by-step progress updates

### **File Operations**

#### **Creating Files**
- Right-click folder → "New File"
- Use `Ctrl+N` shortcut
- AI can create files through chat

#### **Uploading Projects**
- Click "Open Folder" to upload entire projects
- Drag & drop files and folders
- Files are stored on the backend

#### **Editing Files**
- Click files to open in editor
- Multiple tabs for different files
- Auto-save prevents data loss
- Real-time syntax highlighting

### **Terminal Usage**

#### **Basic Commands**
- `npm install` - Install packages
- `git status` - Check git status
- `ls` - List files
- `cd` - Change directories

#### **Development Workflow**
- Run your development server
- Execute build commands
- Manage git operations
- Install dependencies

### **Keyboard Shortcuts**

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save file |
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+F` | Search files |
| `Ctrl+K` | AI code generation |
| `Ctrl+L` | Open AI chat |
| `Ctrl+Space` | AI code completion |
| `Ctrl+Shift+A` | AI code analysis |
| `Ctrl+Shift+R` | AI refactoring |
| `F5` | Run code |
| `F9` | Debug code |
| `Ctrl+,` | Open settings |

## 🔧 **Configuration**

### **AI Model Settings**
```typescript
// In Settings → AI Models
{
  "name": "Llama 3.1 8B",
  "provider": "ollama",
  "endpoint": "https://your-ollama-endpoint",
  "model": "llama3.1:8b",
  "temperature": 0.7,
  "maxTokens": 32000
}
```

### **Editor Settings**
```typescript
// In Settings → Editor
{
  "theme": "dark",
  "fontSize": 14,
  "tabSize": 2,
  "wordWrap": true,
  "minimap": true,
  "autoSave": true
}
```

## 🚀 **Advanced Features**

### **Multi-Agent Collaboration**
The Agent Workflow system uses multiple AI agents:
- **Planner Agent** - Analyzes requirements and creates plans
- **Verifier Agent** - Reviews and validates solutions
- **Implementer Agent** - Writes and refactors code

### **Context-Aware AI**
AI understands:
- Current workspace structure
- Open files and their content
- Terminal history
- Project dependencies
- File relationships

### **Real-time Collaboration**
- WebSocket connections for live updates
- File change notifications
- Terminal output streaming
- AI response streaming

## 🔒 **Security**

### **File System Security**
- Path sanitization prevents directory traversal
- File size limits prevent abuse
- Type validation for uploads
- Secure file operations

### **AI Security**
- Local LLM deployment (Ollama)
- No code sent to external services
- Configurable model endpoints
- Secure API communication

## 🐛 **Troubleshooting**

### **AI Not Working**
1. Check Ollama is running: `ollama list`
2. Verify endpoint in settings
3. Check browser console for errors
4. Ensure model is downloaded: `ollama pull llama3.1:8b`

### **Backend Connection Issues**
1. Check Railway deployment status
2. Verify environment variables
3. Check backend logs
4. Test health endpoint: `/api/health`

### **File Upload Problems**
1. Check file size limits
2. Verify file types are allowed
3. Check backend storage permissions
4. Review browser console errors

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details

## 🆘 **Support**

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: This README and code comments

---

**This is a REAL, FUNCTIONAL code editor with AI assistance. Not a mockup!** 🚀 