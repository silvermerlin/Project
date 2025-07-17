# 🚀 AI Code Editor Backend - Complete Setup Guide

## 📋 **What You Get**

This backend transforms your AI code editor into a **REAL** functional development environment with:

### ✅ **Core Features**
- **Real File System**: Create, read, write, delete files and folders
- **Live Terminal**: Execute ANY command with real terminal access
- **AI Integration**: Connected to your Ollama instance
- **WebSocket Support**: Real-time updates and terminal streaming
- **Multi-Computer Support**: Leverage your network computers
- **File Watching**: Auto-refresh when files change
- **Upload/Download**: Full file management

### 🛠️ **Technical Stack**
- **Node.js + Express**: Fast, scalable backend
- **node-pty**: Real terminal emulation
- **WebSockets**: Real-time communication
- **Chokidar**: File system monitoring
- **Axios**: HTTP client for AI communication
- **Docker**: Containerized deployment

## 🏗️ **Installation Options**

### Option 1: Quick Start (Recommended)

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Copy environment config
cp env.example .env

# 3. Update .env with your settings
nano .env
# Set OLLAMA_HOST=192.168.4.88:11434
# Set WORKSPACE_DIR=/path/to/your/workspace

# 4. Start the server
npm start
```

### Option 2: Docker Deployment

```bash
# 1. Build and run with Docker Compose
docker-compose up -d

# 2. Check status
docker-compose ps

# 3. View logs
docker-compose logs -f backend
```

### Option 3: PM2 Process Manager

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start with PM2
pm2 start server.js --name "ai-editor-backend"

# 3. Save PM2 configuration
pm2 save
pm2 startup
```

## ⚙️ **Configuration**

### Environment Variables (.env)

```bash
# Server Settings
PORT=8080
NODE_ENV=development

# Your Ollama instance
OLLAMA_HOST=192.168.4.88:11434

# Workspace directory (where files are stored)
WORKSPACE_DIR=/home/user/ai-editor-workspace

# Remote servers (JSON array)
REMOTE_SERVERS=[
  {
    "id": "computer-2",
    "name": "Development Server",
    "host": "192.168.1.100",
    "port": 8080,
    "type": "development"
  }
]

# Security
CORS_ORIGINS=http://localhost:3000
```

### Multi-Computer Setup

To leverage your 2 computers:

1. **Computer 1** (Main): Run frontend + backend
2. **Computer 2**: Run backend only
3. **Computer 3**: Run backend only (if needed)

```bash
# On Computer 2 & 3
git clone <your-repo>
cd backend
npm install
PORT=8081 npm start  # Different port for each computer
```

Then update your main `.env`:
```bash
REMOTE_SERVERS=[
  {
    "id": "computer-2",
    "name": "Dev Server",
    "host": "192.168.1.100",
    "port": 8081,
    "type": "development"
  }
]
```

## 🔧 **Features & Endpoints**

### 📁 File Operations
- `GET /api/files` - Get file tree
- `GET /api/files/:path` - Read file content
- `POST /api/files/:path` - Create/update file
- `DELETE /api/files/:path` - Delete file
- `POST /api/directories/:path` - Create directory
- `POST /api/upload` - Upload files

### 🖥️ Terminal Operations
- `POST /api/terminal` - Create new terminal
- `POST /api/terminal/:id/execute` - Execute command
- WebSocket: Real-time terminal I/O

### 🤖 AI Integration
- `POST /api/chat` - Chat with AI
- `GET /api/models` - Available AI models

### 🌐 Remote Servers
- `GET /api/remote-servers` - List remote servers
- `POST /api/remote-execute` - Execute remote commands

### 📊 Monitoring
- `GET /api/health` - Health check
- `GET /api/status` - Server status

## 🔌 **Frontend Integration**

Update your `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

## 🚀 **Production Deployment**

### With Docker Compose

```bash
# Production setup
docker-compose -f docker-compose.yml up -d

# With SSL/HTTPS
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Production Setup

```bash
# 1. Build for production
NODE_ENV=production npm install

# 2. Use PM2 for process management
pm2 start ecosystem.config.js

# 3. Setup reverse proxy (Nginx)
sudo apt install nginx
sudo cp nginx.conf /etc/nginx/sites-available/ai-editor
sudo ln -s /etc/nginx/sites-available/ai-editor /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# 4. Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔧 **Troubleshooting**

### Common Issues

**1. Terminal not working**
```bash
# Install node-pty dependencies
npm install node-pty
# On Windows: npm install --global windows-build-tools
```

**2. File permissions**
```bash
# Fix workspace permissions
sudo chown -R $USER:$USER /path/to/workspace
chmod -R 755 /path/to/workspace
```

**3. Ollama connection**
```bash
# Test Ollama connection
curl http://192.168.4.88:11434/api/tags
```

**4. Port already in use**
```bash
# Kill process on port
sudo lsof -t -i:8080 | xargs sudo kill -9
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm start

# Check logs
tail -f logs/server.log
```

## 📱 **Mobile/Tablet Support**

The backend supports mobile development:

```bash
# Allow external connections
HOST=0.0.0.0 PORT=8080 npm start

# Access from mobile
# http://your-computer-ip:8080
```

## 🔒 **Security Considerations**

### Basic Security

```bash
# 1. Firewall setup
sudo ufw allow 8080/tcp
sudo ufw enable

# 2. Environment variables
# Never commit .env files
echo ".env" >> .gitignore

# 3. HTTPS in production
# Use reverse proxy with SSL
```

### Advanced Security

```bash
# 1. Rate limiting
npm install express-rate-limit

# 2. Authentication
npm install jsonwebtoken bcryptjs

# 3. Input validation
npm install joi helmet
```

## 📊 **Performance Optimization**

### Caching

```bash
# Redis for caching
docker run -d --name redis redis:alpine
```

### Load Balancing

```bash
# PM2 cluster mode
pm2 start server.js -i max
```

## 🔄 **Backup & Recovery**

### Automated Backups

```bash
#!/bin/bash
# backup.sh
tar -czf backup-$(date +%Y%m%d).tar.gz workspace/
rsync -av workspace/ backup-server:/backups/
```

### Database Backups

```bash
# PostgreSQL backup
pg_dump ai_editor > backup.sql

# Restore
psql ai_editor < backup.sql
```

## 🎯 **Next Steps**

1. **Start the backend**: `npm start`
2. **Test with curl**: `curl http://localhost:8080/api/health`
3. **Update frontend**: Point to `http://localhost:8080`
4. **Test file operations**: Create/read/write files
5. **Test terminal**: Execute commands
6. **Test AI**: Chat with your models
7. **Scale up**: Add more computers to your network

## 📞 **Support**

If you encounter issues:

1. **Check logs**: `tail -f logs/server.log`
2. **Test endpoints**: Use Postman or curl
3. **Verify Ollama**: Test AI connection
4. **Check permissions**: File/folder access
5. **Network issues**: Firewall/ports

---

🎉 **Congratulations!** You now have a fully functional AI code editor backend that rivals professional IDEs!

**Your editor can now:**
- ✅ Actually create and edit files
- ✅ Execute real terminal commands
- ✅ Use AI to help with coding
- ✅ Watch files for changes
- ✅ Upload/download files
- ✅ Scale across multiple computers

**This is a REAL development environment!** 🚀 