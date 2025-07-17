# 🤖 AI Code Editor - Desktop Application

A **REAL** desktop code editor with advanced AI assistance, built with Electron, React, TypeScript, and Ollama. This is a fully functional development environment that runs locally on your machine.

## 🚀 **Desktop App Features**

### ✅ **Native Desktop Experience**
- **Electron App** - Runs as a native desktop application
- **No Browser Required** - Standalone app with native menus
- **Local File System Access** - Direct access to your files
- **Native Dialogs** - File open/save dialogs
- **System Integration** - App shortcuts, notifications, etc.

### 🤖 **AI-Powered Features**
- **AI Code Completion** - Intelligent code suggestions (Ctrl+Space)
- **AI Code Generation** - Generate code from natural language (Ctrl+K)
- **AI Code Analysis** - Analyze code quality and find issues (Ctrl+Shift+A)
- **AI Refactoring** - Automatically refactor code (Ctrl+Shift+R)
- **AI Chat Assistant** - Interactive AI coding help (Ctrl+L)
- **Agent Workflow** - Multi-agent collaboration for complex tasks
- **Local Ollama Integration** - Uses your local LLM instance

### 📁 **File Management**
- **Real File System** - Create, read, write, delete files
- **Native File Dialogs** - Open/save files using system dialogs
- **File Explorer** - Tree-based file navigation
- **Tab Management** - Multiple open files with tabs
- **Auto-save** - Files save automatically after 2 seconds
- **File Watching** - Real-time file change detection

### 🖥️ **Terminal Integration**
- **Real Terminal** - Execute actual system commands
- **Multiple Terminals** - Multiple terminal sessions
- **Command History** - Navigate through command history
- **Working Directory** - Proper CWD management
- **Real-time Output** - Live command execution

## 🛠️ **Tech Stack**

### **Desktop App**
- **Electron** - Desktop app framework
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Monaco Editor** - VS Code's editor component

### **Backend**
- **Node.js** - Server runtime
- **Express** - Web framework
- **WebSockets** - Real-time communication
- **node-pty** - Real terminal emulation
- **Chokidar** - File system watching

### **AI Integration**
- **Ollama** - Local LLM integration
- **Agent Orchestrator** - Multi-agent workflow system
- **Context Management** - AI understands your workspace

## 📦 **Installation**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Ollama (for AI features)

### **Quick Start (Windows)**

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-code-editor
   ```

2. **Run the desktop app startup script**
   ```bash
   .\start-desktop.ps1
   ```

   This script will:
   - Install all dependencies
   - Create configuration files
   - Start the backend server
   - Launch the desktop app

### **Manual Setup**

1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

2. **Set up Ollama**
   ```bash
   # Install Ollama (https://ollama.ai)
   # Pull a model
   ollama pull llama3.1:8b
   ```

3. **Configure backend**
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your Ollama settings:
   # OLLAMA_HOST=192.168.4.88:11434
   ```

4. **Start the app**
   ```bash
   # Terminal 1: Backend
   cd backend && npm start
   
   # Terminal 2: Desktop App
   npm run electron-dev
   ```

## 🎯 **Usage Guide**

### **Desktop App Features**

#### **Native Menus**
- **File Menu** - New file, open file/folder, save, exit
- **Edit Menu** - Cut, copy, paste, undo, redo
- **View Menu** - Reload, dev tools, zoom
- **AI Menu** - All AI features with keyboard shortcuts

#### **File Operations**
- **Ctrl+N** - New file
- **Ctrl+O** - Open file (native dialog)
- **Ctrl+Shift+O** - Open folder (native dialog)
- **Ctrl+S** - Save file
- **Ctrl+Q** - Exit app

#### **AI Features**
- **Ctrl+K** - AI code generation
- **Ctrl+L** - Open AI chat
- **Ctrl+Space** - AI code completion
- **Ctrl+Shift+A** - AI code analysis
- **Ctrl+Shift+R** - AI refactoring

### **AI Configuration**

The app connects to your local Ollama instance at `192.168.4.88:11434`. Make sure:

1. **Ollama is running** on your network
2. **Model is downloaded**: `ollama pull llama3.1:8b`
3. **Backend .env is configured** with the correct Ollama host

### **Development Workflow**

1. **Open the desktop app**
2. **Use Ctrl+O to open a project folder**
3. **Start coding with AI assistance**
4. **Use the terminal for commands**
5. **Save files with Ctrl+S**

## 🔧 **Configuration**

### **Backend Configuration (backend/.env)**
```bash
# Ollama Configuration
OLLAMA_HOST=192.168.4.88:11434

# Workspace Directory
WORKSPACE_DIR=./workspace

# Server Settings
PORT=8080
NODE_ENV=development
```

### **AI Model Settings**
The app uses these default models:
- **Llama 3.1 8B** - Main AI model for code generation
- **Llama 3** - Alternative model

You can configure models in the app settings.

## 🚀 **Building the App**

### **Development**
```bash
npm run electron-dev
```

### **Production Build**
```bash
npm run electron-dist
```

This creates installable packages for your platform:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` file
- **Linux**: `.AppImage` file

## 🔒 **Security**

### **Local Only**
- **No cloud dependencies** - Everything runs locally
- **Local Ollama** - AI runs on your network
- **Local file system** - Files stay on your machine
- **No data sent to external services**

### **Electron Security**
- **Context isolation** - Secure IPC communication
- **No node integration** - Renderer process is sandboxed
- **Preload scripts** - Safe API exposure

## 🐛 **Troubleshooting**

### **AI Not Working**
1. Check Ollama is running: `ollama list`
2. Verify network connectivity to `192.168.4.88:11434`
3. Check backend logs for connection errors
4. Ensure model is downloaded: `ollama pull llama3.1:8b`

### **Desktop App Won't Start**
1. Check Node.js version: `node --version`
2. Verify all dependencies installed: `npm install`
3. Check backend is running on port 8080
4. Review Electron logs in DevTools

### **File Operations Not Working**
1. Check file permissions
2. Verify backend is running
3. Check workspace directory exists
4. Review backend logs

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the desktop app
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details

## 🆘 **Support**

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: This README and code comments

---

**This is a REAL, FUNCTIONAL desktop code editor with AI assistance!** 🚀

**No browser required - runs as a native desktop application with full access to your local file system and Ollama AI.** 