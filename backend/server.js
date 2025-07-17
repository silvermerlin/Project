import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
// import { spawn } from 'node-pty'; // Temporarily disabled for Windows compatibility
import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import archiver from 'archiver';
import unzipper from 'unzipper';
import http from 'http';
import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const PORT = process.env.PORT || 8080;
const OLLAMA_HOST = process.env.OLLAMA_HOST || '192.168.4.88:11434';
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(os.homedir(), 'ai-editor-workspace');
const REMOTE_SERVERS = JSON.parse(process.env.REMOTE_SERVERS || '[]');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory storage for active terminals and file watchers
const terminals = new Map();
const fileWatchers = new Map();
const clients = new Set();

// Ensure workspace directory exists
await fs.mkdir(WORKSPACE_DIR, { recursive: true });

console.log(`🚀 AI Code Editor Backend Server`);
console.log(`📁 Workspace: ${WORKSPACE_DIR}`);
console.log(`🤖 Ollama: ${OLLAMA_HOST}`);
console.log(`🌐 Port: ${PORT}`);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API health check endpoint (for frontend)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    workspace: WORKSPACE_DIR,
    terminals: terminals.size,
    watchers: fileWatchers.size,
    clients: clients.size
  });
});

// ============================================================================
// 🗂️ FILE SYSTEM OPERATIONS
// ============================================================================

// List files (frontend expects this endpoint)
app.get('/api/files/list', async (req, res) => {
  try {
    const { path: requestPath = '/' } = req.query;
    const fullPath = path.join(WORKSPACE_DIR, requestPath);
    
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      const fileList = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(fullPath, item.name);
          const relativePath = path.relative(WORKSPACE_DIR, itemPath);
          const stats = await fs.stat(itemPath);
          
          return {
            name: item.name,
            path: relativePath,
            type: item.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime,
            isDirectory: item.isDirectory()
          };
        })
      );
      
      res.json(fileList);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: 'Failed to read directory' });
  }
});

// Get file content (frontend expects this endpoint)
app.get('/api/files/content', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    res.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Save file content (frontend expects this endpoint)
app.post('/api/files/save', async (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }
    
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Upload file (frontend expects this endpoint)
app.post('/api/files/upload', async (req, res) => {
  try {
    // Handle multipart form data
    const multer = (await import('multer')).default;
    const upload = multer({ dest: '/tmp/' });
    
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ error: 'Upload failed' });
      }
      
      try {
        const file = req.file;
        const { path: targetPath = '/' } = req.body;
        
        if (!file) {
          return res.status(400).json({ error: 'No file provided' });
        }
        
        const filePath = path.join(WORKSPACE_DIR, targetPath, file.originalname);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Move uploaded file to destination
        await fs.copyFile(file.path, filePath);
        await fs.unlink(file.path); // Clean up temp file
        
        res.json({ success: true, filePath: path.relative(WORKSPACE_DIR, filePath) });
      } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Failed to process upload' });
      }
    });
  } catch (error) {
    console.error('Error setting up upload:', error);
    res.status(500).json({ error: 'Upload setup failed' });
  }
});

// Create file (frontend expects this endpoint)
app.post('/api/files/create', async (req, res) => {
  try {
    const { path: filePath, content = '' } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// Create folder (frontend expects this endpoint)
app.post('/api/files/create-folder', async (req, res) => {
  try {
    const { path: folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    
    const fullPath = path.join(WORKSPACE_DIR, folderPath);
    await fs.mkdir(fullPath, { recursive: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Delete file (frontend expects this endpoint)
app.delete('/api/files/delete', async (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await fs.rmdir(fullPath, { recursive: true });
    } else {
      await fs.unlink(fullPath);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Rename file (frontend expects this endpoint)
app.post('/api/files/rename', async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Old path and new path are required' });
    }
    
    const oldFullPath = path.join(WORKSPACE_DIR, oldPath);
    const newFullPath = path.join(WORKSPACE_DIR, newPath);
    
    await fs.mkdir(path.dirname(newFullPath), { recursive: true });
    await fs.rename(oldFullPath, newFullPath);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ error: 'Failed to rename file' });
  }
});

// Terminal endpoint (frontend expects this endpoint)
app.post('/api/terminal', async (req, res) => {
  try {
    const { command, cwd = '/workspace' } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    // Simple command execution using child_process
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const result = await execAsync(command, { 
      cwd: path.join(WORKSPACE_DIR, cwd),
      timeout: 30000 
    });
    
    res.json({ 
      output: result.stdout + result.stderr,
      exitCode: 0,
      cwd: cwd
    });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({ 
      output: error.message,
      exitCode: 1,
      cwd: req.body.cwd || '/workspace'
    });
  }
});

// Get file tree (original endpoint - keeping for compatibility)
app.get('/api/files', async (req, res) => {
  try {
    const { path: requestPath = '' } = req.query;
    const fullPath = path.join(WORKSPACE_DIR, requestPath);
    
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      const fileTree = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(fullPath, item.name);
          const relativePath = path.relative(WORKSPACE_DIR, itemPath);
          const stats = await fs.stat(itemPath);
          
          return {
            id: uuidv4(),
            name: item.name,
            path: relativePath,
            type: item.isDirectory() ? 'folder' : 'file',
            size: stats.size,
            modified: stats.mtime,
            expanded: false
          };
        })
      );
      
      res.json(fileTree);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: 'Failed to read directory' });
  }
});

// ============================================================================
// 🖥️ TERMINAL OPERATIONS
// ============================================================================

// Create new terminal
app.post('/api/terminal', async (req, res) => {
  try {
    const { cwd = WORKSPACE_DIR, shell = 'bash' } = req.body;
    const terminalId = uuidv4();
    
    // Determine shell based on OS
    const defaultShell = process.platform === 'win32' ? 'powershell' : 'bash';
    const terminalShell = shell || defaultShell;
    
    const terminal = spawn(terminalShell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: cwd,
      env: process.env
    });
    
    terminals.set(terminalId, terminal);
    
    res.json({ 
      success: true, 
      terminalId,
      shell: terminalShell,
      cwd: cwd
    });
  } catch (error) {
    console.error('Error creating terminal:', error);
    res.status(500).json({ error: 'Failed to create terminal' });
  }
});

// Execute command in terminal
app.post('/api/terminal/:terminalId/execute', async (req, res) => {
  try {
    const { terminalId } = req.params;
    const { command } = req.body;
    
    const terminal = terminals.get(terminalId);
    if (!terminal) {
      return res.status(404).json({ error: 'Terminal not found' });
    }
    
    // Write command to terminal
    terminal.write(command + '\r');
    
    // Collect output for a reasonable time
    let output = '';
    const timeout = setTimeout(() => {
      res.json({ success: true, output });
    }, 2000);
    
    const onData = (data) => {
      output += data;
      if (data.includes('$') || data.includes('>')) {
        clearTimeout(timeout);
        terminal.off('data', onData);
        res.json({ success: true, output });
      }
    };
    
    terminal.on('data', onData);
    
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({ error: 'Failed to execute command' });
  }
});

// ============================================================================
// 🤖 AI INTEGRATION
// ============================================================================

// Chat with AI
app.post('/api/chat', async (req, res) => {
  try {
    const { message, model = 'llama3.1', context = {} } = req.body;
    
    // Prepare context for AI
    const systemPrompt = `You are an AI coding assistant integrated into a VS Code-like editor. 
    
Context:
- Current workspace: ${WORKSPACE_DIR}
- Available files: ${JSON.stringify(context.files || [])}
- Current file: ${context.currentFile || 'none'}
- Terminal history: ${JSON.stringify(context.terminalHistory || [])}

You can help with:
1. Code analysis and suggestions
2. File operations (create, modify, delete)
3. Terminal commands
4. Project structure recommendations
5. Debugging assistance

When you need to perform actions, use these formats:
- FILE_CREATE: filename.ext
- FILE_MODIFY: filename.ext
- TERMINAL_EXEC: command
- FILE_DELETE: filename.ext

Respond in a helpful, concise manner focused on coding tasks.`;

    const response = await axios.post(`http://${OLLAMA_HOST}/api/generate`, {
      model,
      prompt: message,
      system: systemPrompt,
      stream: false,
      context: context
    });
    
    res.json({ 
      success: true, 
      response: response.data.response,
      model: model,
      context: response.data.context
    });
    
  } catch (error) {
    console.error('Error with AI chat:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message
    });
  }
});

// Get available AI models
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get(`http://${OLLAMA_HOST}/api/tags`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// ============================================================================
// 🌐 WEBSOCKET CONNECTIONS
// ============================================================================

wss.on('connection', (ws) => {
  console.log('🔗 New WebSocket connection');
  clients.add(ws);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'terminal_connect':
          handleTerminalConnection(ws, data);
          break;
        case 'terminal_input':
          handleTerminalInput(data);
          break;
        case 'file_watch':
          handleFileWatch(data);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket disconnected');
    clients.delete(ws);
  });
});

// Terminal WebSocket handlers
function handleTerminalConnection(ws, data) {
  const { terminalId } = data;
  const terminal = terminals.get(terminalId);
  
  if (terminal) {
    terminal.on('data', (output) => {
      ws.send(JSON.stringify({
        type: 'terminal_output',
        terminalId,
        data: output
      }));
    });
    
    terminal.on('exit', (code) => {
      ws.send(JSON.stringify({
        type: 'terminal_exit',
        terminalId,
        code
      }));
    });
  }
}

function handleTerminalInput(data) {
  const { terminalId, input } = data;
  const terminal = terminals.get(terminalId);
  
  if (terminal) {
    terminal.write(input);
  }
}

// File watching
function handleFileWatch(data) {
  const { path: watchPath } = data;
  const fullPath = path.join(WORKSPACE_DIR, watchPath);
  
  if (!fileWatchers.has(watchPath)) {
    const watcher = chokidar.watch(fullPath, {
      ignored: /node_modules|\.git/,
      persistent: true
    });
    
    watcher.on('change', (filePath) => {
      broadcastToClients({
        type: 'file_changed',
        data: {
          path: path.relative(WORKSPACE_DIR, filePath),
          action: 'modified'
        }
      });
    });
    
    fileWatchers.set(watchPath, watcher);
  }
}

// ============================================================================
// 🚀 REMOTE SERVERS & MULTI-COMPUTER SUPPORT
// ============================================================================

// Get remote servers status
app.get('/api/remote-servers', async (req, res) => {
  try {
    const servers = await Promise.all(
      REMOTE_SERVERS.map(async (server) => {
        try {
          const response = await axios.get(`http://${server.host}:${server.port}/api/status`, {
            timeout: 5000
          });
          return { ...server, status: 'online', ...response.data };
        } catch (error) {
          return { ...server, status: 'offline', error: error.message };
        }
      })
    );
    
    res.json(servers);
  } catch (error) {
    console.error('Error checking remote servers:', error);
    res.status(500).json({ error: 'Failed to check remote servers' });
  }
});

// Execute command on remote server
app.post('/api/remote-execute', async (req, res) => {
  try {
    const { serverId, command } = req.body;
    const server = REMOTE_SERVERS.find(s => s.id === serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    const response = await axios.post(
      `http://${server.host}:${server.port}/api/execute`,
      { command },
      { timeout: 30000 }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Error executing remote command:', error);
    res.status(500).json({ error: 'Failed to execute remote command' });
  }
});

// ============================================================================
// 🛠️ UTILITY FUNCTIONS
// ============================================================================

function broadcastToClients(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    workspace: WORKSPACE_DIR,
    terminals: terminals.size,
    watchers: fileWatchers.size,
    clients: clients.size
  });
});

// Server status
app.get('/api/status', (req, res) => {
  res.json({
    server: 'ai-code-editor-backend',
    version: '1.0.0',
    uptime: process.uptime(),
    platform: process.platform,
    node: process.version,
    workspace: WORKSPACE_DIR,
    features: {
      fileSystem: true,
      terminal: true,
      ai: true,
      websocket: true,
      remoteServers: REMOTE_SERVERS.length > 0
    }
  });
});

// ============================================================================
// 🎯 START SERVER
// ============================================================================

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🎯 Ready to serve at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  
  // Close all terminals
  terminals.forEach(terminal => terminal.kill());
  
  // Close all file watchers
  fileWatchers.forEach(watcher => watcher.close());
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}); 