# AI Code Editor

A modern, browser-based code editor with AI assistance, built with React, TypeScript, and Vite.

## 🚀 Features

- **Modern UI**: VS Code-inspired interface with dark theme
- **File Management**: Upload folders, create files, right-click context menus
- **Multi-Terminal**: Multiple terminal instances with command history
- **AI Integration**: Ready for AI agent workflows
- **Real-time Editing**: Syntax highlighting and live code editing
- **Responsive Design**: Works on desktop and tablet devices

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Lucide React icons, Tailwind CSS
- **State Management**: React Context API
- **Terminal**: Custom terminal implementation
- **File System**: Browser-based file handling

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-code-editor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Connect your GitHub account
   - Import your repository
   - Vercel will automatically detect it's a Vite app and deploy

### Manual Build

```bash
npm run build
npm run preview
```

## 🎯 Usage

### File Operations
- **Upload Folder**: Click "Open Folder" to upload entire project folders
- **Create Files**: Right-click on folders → "New File..."
- **Context Menus**: Right-click on files/folders for options
- **File Editing**: Click on files to open them in the editor

### Terminal
- **Multiple Terminals**: Click the + button to create new terminals
- **Command History**: Use arrow keys to navigate command history
- **Path Integration**: Right-click files → "Open in Terminal"

### AI Features
- **Agent Workflow**: Use the AI panel for code assistance
- **Chat Interface**: Type requests in the AI chat area

## 🔧 Configuration

### Environment Variables
Create a `.env` file for local development:
```env
VITE_API_URL=http://localhost:8080
```

### Backend Integration
The app is designed to work with a Node.js backend server. Backend features include:
- File system operations
- AI agent orchestration
- WebSocket communication

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Sidebar.tsx     # File explorer and navigation
│   ├── Editor.tsx      # Code editor component
│   ├── TerminalTabs.tsx # Terminal interface
│   └── ...
├── contexts/           # React contexts
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── App.tsx            # Main application component
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by VS Code
- Built with modern web technologies
- Designed for developer productivity

---

**Built with ❤️ by silvermerlin** 