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
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'https://editor.pinkchairparley.org';
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(os.homedir(), 'ai-editor-workspace');
const REMOTE_SERVERS = JSON.parse(process.env.REMOTE_SERVERS || '[]');

// Middleware
app.use(cors({
  origin: true, // Allow all origins for now
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Upload file endpoint - must be defined BEFORE JSON middleware
app.post('/api/files/upload', async (req, res) => {
  try {
    console.log('Upload request received:', {
      method: req.method,
      url: req.url,
      headers: req.headers['content-type'],
      bodyKeys: Object.keys(req.body || {})
    });
    
    // Handle multipart form data
    const multer = (await import('multer')).default;
    const upload = multer({ 
      dest: '/tmp/',
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1
      }
    });
    
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(400).json({ error: `Upload failed: ${err.message}` });
      }
      
      try {
        const file = req.file;
        const targetPath = req.body.path || '/';
        
        console.log('Upload processing:', {
          hasFile: !!file,
          fileInfo: file ? {
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path
          } : null,
          targetPath: targetPath,
          bodyKeys: Object.keys(req.body || {})
        });
        
        if (!file) {
          return res.status(400).json({ error: 'No file provided in request' });
        }
        
        // targetPath already includes the full path including filename, so we don't need to add file.originalname again
        const filePath = path.join(WORKSPACE_DIR, targetPath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Move uploaded file to destination
        await fs.copyFile(file.path, filePath);
        await fs.unlink(file.path); // Clean up temp file
        
        console.log('File uploaded successfully:', path.relative(WORKSPACE_DIR, filePath));
        res.json({ success: true, filePath: path.relative(WORKSPACE_DIR, filePath) });
      } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: `Failed to process upload: ${error.message}` });
      }
    });
  } catch (error) {
    console.error('Error setting up upload:', error);
    res.status(500).json({ error: `Upload setup failed: ${error.message}` });
  }
});

// JSON middleware for other routes
app.use(express.json({ limit: '50mb' }));

// In-memory storage for active terminals and file watchers
const terminals = new Map();
const fileWatchers = new Map();
const clients = new Set();

// Ensure workspace directory exists
await fs.mkdir(WORKSPACE_DIR, { recursive: true });

// Start file watching for the entire workspace
const workspaceWatcher = chokidar.watch(WORKSPACE_DIR, {
  ignored: /node_modules|\.git|\.DS_Store|Thumbs\.db/,
  persistent: true,
  ignoreInitial: true
});

workspaceWatcher.on('change', (filePath) => {
  const relativePath = path.relative(WORKSPACE_DIR, filePath);
  console.log('📝 File changed:', relativePath);
  
  broadcastToClients({
    type: 'file:updated',
    data: {
      path: relativePath,
      action: 'modified',
      timestamp: Date.now()
    }
  });
});

workspaceWatcher.on('add', (filePath) => {
  const relativePath = path.relative(WORKSPACE_DIR, filePath);
  console.log('📄 File created:', relativePath);
  
  broadcastToClients({
    type: 'file:created',
    data: {
      path: relativePath,
      action: 'created',
      timestamp: Date.now()
    }
  });
});

workspaceWatcher.on('unlink', (filePath) => {
  const relativePath = path.relative(WORKSPACE_DIR, filePath);
  console.log('🗑️ File deleted:', relativePath);
  
  broadcastToClients({
    type: 'file:deleted',
    data: {
      path: relativePath,
      action: 'deleted',
      timestamp: Date.now()
    }
  });
});

console.log(`🚀 AI Code Editor Backend Server`);
console.log(`📁 Workspace: ${WORKSPACE_DIR}`);
console.log(`🤖 Ollama: ${OLLAMA_HOST}`);
console.log(`🌐 Port: ${PORT}`);
console.log(`👀 File watching enabled for workspace`);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    ollamaHost: OLLAMA_HOST,
    cors: 'enabled'
  });
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

// Download file endpoint (frontend expects this endpoint)
app.get('/api/files/download', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const fullPath = path.join(WORKSPACE_DIR, filePath);
    const stats = await fs.stat(fullPath);
    
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }
    
    // Set appropriate headers for file download
    const fileName = path.basename(fullPath);
    const contentType = mime.lookup(fileName) || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file
    const fileStream = await import('fs').then(fs => fs.createReadStream(fullPath));
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Terminal endpoint (frontend expects this endpoint)
app.post('/api/terminal', async (req, res) => {
  try {
    const { command, cwd = '/workspace' } = req.body;
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    console.log('🖥️ Executing terminal command:', { command, cwd });
    
    // Simple command execution using child_process
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Ensure the working directory exists
    const workingDir = path.join(WORKSPACE_DIR, cwd);
    await fs.mkdir(workingDir, { recursive: true });
    
    const result = await execAsync(command, { 
      cwd: workingDir,
      timeout: 30000 
    });
    
    console.log('🖥️ Command executed successfully:', { 
      stdout: result.stdout.length, 
      stderr: result.stderr.length,
      exitCode: 0
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

    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
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
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Ollama health check endpoint
app.get('/api/ollama/health', async (req, res) => {
  try {
    console.log('🔍 Checking Ollama health at:', `${OLLAMA_HOST}/api/tags`);
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, {
      timeout: 5000
    });
    res.json({ 
      status: 'healthy', 
      models: response.data.models || [],
      endpoint: OLLAMA_HOST
    });
  } catch (error) {
    console.error('❌ Ollama health check failed:', error.message);
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error.message,
      endpoint: OLLAMA_HOST
    });
  }
});

// Ollama proxy endpoints
app.get('/api/ollama/api/tags', async (req, res) => {
  try {
    console.log('🔍 Ollama proxy request to:', `${OLLAMA_HOST}/api/tags`);
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AI-Code-Editor/1.0'
      }
    });
    
    console.log('✅ Ollama proxy response status:', response.status);
    console.log('✅ Ollama proxy response data:', response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('❌ Ollama tags request failed:', error.message);
    
    // Log more details about the error
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response headers:', error.response.headers);
      console.error('❌ Response data:', error.response.data);
    }
    
    res.status(503).json({ 
      error: 'Failed to fetch Ollama models',
      details: error.message,
      endpoint: OLLAMA_HOST
    });
  }
});

app.post('/api/ollama/api/chat', async (req, res) => {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/chat`, req.body, {
      timeout: 300000, // 5 minutes for LLM responses
      headers: {
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Ollama chat request failed:', error.message);
    res.status(503).json({ 
      error: 'Failed to get response from Ollama',
      details: error.message
    });
  }
});

app.post('/api/ollama/api/generate', async (req, res) => {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, req.body, {
      timeout: 300000, // 5 minutes for LLM responses
      headers: {
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('❌ Ollama generate request failed:', error.message);
    res.status(503).json({ 
      error: 'Failed to get response from Ollama',
      details: error.message
    });
  }
});

// AI Chat endpoint (frontend expects this endpoint)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
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

Respond in a helpful, concise manner focused on coding tasks.`;

    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: 'llama3.1',
      prompt: message,
      system: systemPrompt,
      stream: false
    });
    
    res.json({ 
      response: response.data.response,
      model: 'llama3.1'
    });
    
  } catch (error) {
    console.error('Error with AI chat:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: error.message
    });
  }
});

// AI Code completion endpoint (frontend expects this endpoint)
app.post('/api/ai/complete', async (req, res) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    const prompt = `Complete the following ${language || 'code'}:\n\n${code}\n\nCompletion:`;
    
    const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
      model: 'llama3.1',
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9
      }
    });
    
    res.json({ 
      completion: response.data.response
    });
    
  } catch (error) {
    console.error('Error with AI completion:', error);
    res.status(500).json({ 
      error: 'Failed to get AI completion',
      details: error.message
    });
  }
});

// Git status endpoint (frontend expects this endpoint)
app.get('/api/git/status', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const result = await execAsync('git status --porcelain', { 
      cwd: WORKSPACE_DIR,
      timeout: 10000 
    });
    
    const files = result.stdout.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const status = line.substring(0, 2);
        const path = line.substring(3);
        return {
          path,
          status: status.trim(),
          staged: status[0] !== ' ',
          modified: status[1] !== ' '
        };
      });
    
    res.json({ 
      status: 'success',
      files
    });
    
  } catch (error) {
    console.error('Error getting git status:', error);
    res.status(500).json({ 
      error: 'Failed to get git status',
      details: error.message
    });
  }
});

// Git commit endpoint (frontend expects this endpoint)
app.post('/api/git/commit', async (req, res) => {
  try {
    const { message, files = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Commit message is required' });
    }
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Add files if specified
    if (files.length > 0) {
      await execAsync(`git add ${files.join(' ')}`, { cwd: WORKSPACE_DIR });
    } else {
      await execAsync('git add .', { cwd: WORKSPACE_DIR });
    }
    
    // Commit
    const result = await execAsync(`git commit -m "${message}"`, { 
      cwd: WORKSPACE_DIR,
      timeout: 10000 
    });
    
    // Extract commit hash
    const commitMatch = result.stdout.match(/\[([a-f0-9]+)\]/);
    const commitId = commitMatch ? commitMatch[1] : null;
    
    res.json({ 
      success: true,
      commitId,
      message: result.stdout
    });
    
  } catch (error) {
    console.error('Error creating git commit:', error);
    res.status(500).json({ 
      error: 'Failed to create git commit',
      details: error.message
    });
  }
});

// Git push endpoint (frontend expects this endpoint)
app.post('/api/git/push', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const result = await execAsync('git push', { 
      cwd: WORKSPACE_DIR,
      timeout: 30000 
    });
    
    res.json({ 
      success: true,
      message: result.stdout
    });
    
  } catch (error) {
    console.error('Error pushing to git:', error);
    res.status(500).json({ 
      error: 'Failed to push to git',
      details: error.message
    });
  }
});

// Git pull endpoint (frontend expects this endpoint)
app.post('/api/git/pull', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const result = await execAsync('git pull', { 
      cwd: WORKSPACE_DIR,
      timeout: 30000 
    });
    
    res.json({ 
      success: true,
      message: result.stdout
    });
    
  } catch (error) {
    console.error('Error pulling from git:', error);
    res.status(500).json({ 
      error: 'Failed to pull from git',
      details: error.message
    });
  }
});

// Package installation endpoint (frontend expects this endpoint)
app.post('/api/packages/install', async (req, res) => {
  try {
    const { packageName, packageManager = 'npm' } = req.body;
    
    if (!packageName) {
      return res.status(400).json({ error: 'Package name is required' });
    }
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    let command;
    switch (packageManager) {
      case 'yarn':
        command = `yarn add ${packageName}`;
        break;
      case 'pnpm':
        command = `pnpm add ${packageName}`;
        break;
      default:
        command = `npm install ${packageName}`;
    }
    
    const result = await execAsync(command, { 
      cwd: WORKSPACE_DIR,
      timeout: 60000 
    });
    
    res.json({ 
      success: true,
      output: result.stdout + result.stderr
    });
    
  } catch (error) {
    console.error('Error installing package:', error);
    res.status(500).json({ 
      error: 'Failed to install package',
      details: error.message
    });
  }
});

// List packages endpoint (frontend expects this endpoint)
app.get('/api/packages/list', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Try to read package.json
    try {
      const packageJson = await fs.readFile(path.join(WORKSPACE_DIR, 'package.json'), 'utf-8');
      const packageData = JSON.parse(packageJson);
      
      res.json({
        dependencies: Object.entries(packageData.dependencies || {}).map(([name, version]) => ({
          name,
          version,
          type: 'dependency'
        })),
        devDependencies: Object.entries(packageData.devDependencies || {}).map(([name, version]) => ({
          name,
          version,
          type: 'devDependency'
        }))
      });
    } catch (error) {
      // No package.json found
      res.json({
        dependencies: [],
        devDependencies: []
      });
    }
    
  } catch (error) {
    console.error('Error listing packages:', error);
    res.status(500).json({ 
      error: 'Failed to list packages',
      details: error.message
    });
  }
});

// Uninstall package endpoint (frontend expects this endpoint)
app.delete('/api/packages/uninstall', async (req, res) => {
  try {
    const { packageName, packageManager = 'npm' } = req.body;
    
    if (!packageName) {
      return res.status(400).json({ error: 'Package name is required' });
    }
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    let command;
    switch (packageManager) {
      case 'yarn':
        command = `yarn remove ${packageName}`;
        break;
      case 'pnpm':
        command = `pnpm remove ${packageName}`;
        break;
      default:
        command = `npm uninstall ${packageName}`;
    }
    
    const result = await execAsync(command, { 
      cwd: WORKSPACE_DIR,
      timeout: 30000 
    });
    
    res.json({ 
      success: true,
      output: result.stdout + result.stderr
    });
    
  } catch (error) {
    console.error('Error uninstalling package:', error);
    res.status(500).json({ 
      error: 'Failed to uninstall package',
      details: error.message
    });
  }
});

// System info endpoint (frontend expects this endpoint)
app.get('/api/system/info', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Get platform info
    const platform = process.platform;
    const nodeVersion = process.version;
    
    // Get memory info
    const memory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
    };
    
    // Get disk info
    let disk;
    try {
      if (platform === 'win32') {
        const result = await execAsync('wmic logicaldisk get size,freespace,caption', { timeout: 5000 });
        disk = { info: result.stdout };
      } else {
        const result = await execAsync('df -h', { timeout: 5000 });
        disk = { info: result.stdout };
      }
    } catch (error) {
      disk = { error: error.message };
    }
    
    res.json({
      platform,
      nodeVersion,
      memory,
      disk
    });
    
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({ 
      error: 'Failed to get system info',
      details: error.message
    });
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
      ignored: /node_modules|\.git|\.DS_Store|Thumbs\.db/,
      persistent: true,
      ignoreInitial: true
    });
    
    watcher.on('change', (filePath) => {
      const relativePath = path.relative(WORKSPACE_DIR, filePath);
      console.log('📝 File changed:', relativePath);
      
      broadcastToClients({
        type: 'file:updated',
        data: {
          path: relativePath,
          action: 'modified',
          timestamp: Date.now()
        }
      });
    });
    
    watcher.on('add', (filePath) => {
      const relativePath = path.relative(WORKSPACE_DIR, filePath);
      console.log('📄 File created:', relativePath);
      
      broadcastToClients({
        type: 'file:created',
        data: {
          path: relativePath,
          action: 'created',
          timestamp: Date.now()
        }
      });
    });
    
    watcher.on('unlink', (filePath) => {
      const relativePath = path.relative(WORKSPACE_DIR, filePath);
      console.log('🗑️ File deleted:', relativePath);
      
      broadcastToClients({
        type: 'file:deleted',
        data: {
          path: relativePath,
          action: 'deleted',
          timestamp: Date.now()
        }
      });
    });
    
    watcher.on('addDir', (dirPath) => {
      const relativePath = path.relative(WORKSPACE_DIR, dirPath);
      console.log('📁 Directory created:', relativePath);
      
      broadcastToClients({
        type: 'file:created',
        data: {
          path: relativePath,
          action: 'created',
          timestamp: Date.now()
        }
      });
    });
    
    watcher.on('unlinkDir', (dirPath) => {
      const relativePath = path.relative(WORKSPACE_DIR, dirPath);
      console.log('🗑️ Directory deleted:', relativePath);
      
      broadcastToClients({
        type: 'file:deleted',
        data: {
          path: relativePath,
          action: 'deleted',
          timestamp: Date.now()
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