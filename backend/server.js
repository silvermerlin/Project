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

// ============================================================================
// 🗂️ FILE SYSTEM OPERATIONS
// ============================================================================

// Get file tree
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

// Read file content
app.get('/api/files/:path(*)', async (req, res) => {
  try {
    const filePath = path.join(WORKSPACE_DIR, req.params.path);
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    res.json({
      content,
      size: stats.size,
      modified: stats.mtime,
      mimeType: mime.lookup(filePath) || 'text/plain'
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Create/Update file
app.post('/api/files/:path(*)', async (req, res) => {
  try {
    const filePath = path.join(WORKSPACE_DIR, req.params.path);
    const { content, createDir = true } = req.body;
    
    if (createDir) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
    }
    
    await fs.writeFile(filePath, content, 'utf-8');
    const stats = await fs.stat(filePath);
    
    // Notify clients of file change
    broadcastToClients({
      type: 'file_changed',
      data: {
        path: req.params.path,
        action: 'created',
        size: stats.size,
        modified: stats.mtime
      }
    });
    
    res.json({ success: true, size: stats.size, modified: stats.mtime });
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({ error: 'Failed to write file' });
  }
});

// Delete file/directory
app.delete('/api/files/:path(*)', async (req, res) => {
  try {
    const filePath = path.join(WORKSPACE_DIR, req.params.path);
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      await fs.rmdir(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    
    // Notify clients of file deletion
    broadcastToClients({
      type: 'file_changed',
      data: {
        path: req.params.path,
        action: 'deleted'
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Create directory
app.post('/api/directories/:path(*)', async (req, res) => {
  try {
    const dirPath = path.join(WORKSPACE_DIR, req.params.path);
    await fs.mkdir(dirPath, { recursive: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: 'Failed to create directory' });
  }
});

// Upload files
app.post('/api/upload', async (req, res) => {
  try {
    const { files, targetPath = '' } = req.body;
    const results = [];
    
    for (const file of files) {
      const filePath = path.join(WORKSPACE_DIR, targetPath, file.name);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Decode base64 content
      const content = Buffer.from(file.content, 'base64');
      await fs.writeFile(filePath, content);
      
      results.push({
        name: file.name,
        path: path.relative(WORKSPACE_DIR, filePath),
        size: content.length
      });
    }
    
    res.json({ success: true, files: results });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
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