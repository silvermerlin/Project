#!/bin/bash

# AI Code Editor - Quick Setup Script
# This script sets up the complete AI code editor with real backend functionality

set -e

echo "🚀 AI Code Editor - Complete Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${2}${1}${NC}\n"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_color "📋 Checking prerequisites..." $BLUE

if ! command_exists node; then
    print_color "❌ Node.js not found. Please install Node.js 18+." $RED
    exit 1
fi

if ! command_exists npm; then
    print_color "❌ npm not found. Please install npm." $RED
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_color "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 18+." $RED
    exit 1
fi

print_color "✅ Node.js $(node --version) found" $GREEN
print_color "✅ npm $(npm --version) found" $GREEN

# Check for Docker (optional)
if command_exists docker; then
    print_color "✅ Docker found - Docker deployment available" $GREEN
    DOCKER_AVAILABLE=true
else
    print_color "⚠️  Docker not found - Manual setup only" $YELLOW
    DOCKER_AVAILABLE=false
fi

# Ask for setup type
echo ""
print_color "🛠️  Setup Options:" $BLUE
echo "1. Quick Start (Recommended)"
echo "2. Docker Deployment"
echo "3. Development Setup"
echo "4. Production Setup"
echo ""
read -p "Choose setup type (1-4): " SETUP_TYPE

case $SETUP_TYPE in
    1) SETUP_MODE="quick" ;;
    2) SETUP_MODE="docker" ;;
    3) SETUP_MODE="dev" ;;
    4) SETUP_MODE="prod" ;;
    *) SETUP_MODE="quick" ;;
esac

# Get user configuration
echo ""
print_color "⚙️  Configuration:" $BLUE

# Ollama host
read -p "Enter Ollama host (default: 192.168.4.88:11434): " OLLAMA_HOST
OLLAMA_HOST=${OLLAMA_HOST:-"192.168.4.88:11434"}

# Workspace directory
read -p "Enter workspace directory (default: ./workspace): " WORKSPACE_DIR
WORKSPACE_DIR=${WORKSPACE_DIR:-"./workspace"}

# Create workspace directory
mkdir -p "$WORKSPACE_DIR"

# Frontend setup
echo ""
print_color "🎨 Setting up frontend..." $BLUE

# Install frontend dependencies
npm install

# Backend setup
echo ""
print_color "🔧 Setting up backend..." $BLUE

# Create backend directory if it doesn't exist
mkdir -p backend

# Install backend dependencies
cd backend
npm install

# Create .env file
cat > .env << EOF
# AI Code Editor Backend Configuration
PORT=8080
NODE_ENV=development
OLLAMA_HOST=$OLLAMA_HOST
WORKSPACE_DIR=$WORKSPACE_DIR
CORS_ORIGINS=http://localhost:3000
REMOTE_SERVERS=[]
EOF

print_color "✅ Backend configured" $GREEN

# Update frontend vite config
cd ..
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
EOF

print_color "✅ Frontend configured" $GREEN

# Setup based on chosen mode
case $SETUP_MODE in
    "quick")
        print_color "🚀 Quick Start Setup" $BLUE
        
        # Test Ollama connection
        if command_exists curl; then
            print_color "🔍 Testing Ollama connection..." $BLUE
            if curl -s "http://$OLLAMA_HOST/api/tags" > /dev/null; then
                print_color "✅ Ollama connection successful" $GREEN
            else
                print_color "⚠️  Ollama connection failed - check host and port" $YELLOW
            fi
        fi
        
        # Create start script
        cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting AI Code Editor..."

# Start backend
cd backend
node server.js &
BACKEND_PID=$!

# Start frontend
cd ..
npm run dev &
FRONTEND_PID=$!

echo "✅ Backend started (PID: $BACKEND_PID)"
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID" INT
wait
EOF
        chmod +x start.sh
        
        print_color "✅ Quick start setup complete!" $GREEN
        ;;
        
    "docker")
        if [ "$DOCKER_AVAILABLE" = true ]; then
            print_color "🐳 Docker Setup" $BLUE
            
            # Build and start containers
            docker-compose up -d
            
            print_color "✅ Docker containers started" $GREEN
            print_color "🌐 Frontend: http://localhost:3000" $BLUE
            print_color "🔧 Backend: http://localhost:8080" $BLUE
        else
            print_color "❌ Docker not available - switching to quick setup" $RED
            SETUP_MODE="quick"
        fi
        ;;
        
    "dev")
        print_color "🔧 Development Setup" $BLUE
        
        # Install development dependencies
        npm install -D nodemon concurrently
        
        # Add dev scripts to package.json
        cat > package.json << 'EOF'
{
  "name": "ai-code-editor",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && nodemon server.js",
    "dev:frontend": "vite",
    "build": "tsc && vite build",
    "start": "./start.sh"
  },
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-resizable-panels": "^0.0.55",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.1.0",
    "concurrently": "^8.2.0",
    "nodemon": "^3.0.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
EOF
        
        print_color "✅ Development setup complete!" $GREEN
        ;;
        
    "prod")
        print_color "🚀 Production Setup" $BLUE
        
        # Install PM2 if not present
        if ! command_exists pm2; then
            print_color "📦 Installing PM2..." $BLUE
            npm install -g pm2
        fi
        
        # Create PM2 ecosystem file
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ai-editor-backend',
      script: './backend/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      log_file: './logs/app.log',
      error_file: './logs/error.log',
      out_file: './logs/out.log'
    }
  ]
}
EOF
        
        # Create logs directory
        mkdir -p logs
        
        # Build frontend
        npm run build
        
        print_color "✅ Production setup complete!" $GREEN
        ;;
esac

# Create test files
print_color "📝 Creating test files..." $BLUE

mkdir -p "$WORKSPACE_DIR/test"

cat > "$WORKSPACE_DIR/test/hello.js" << 'EOF'
// Test JavaScript file
console.log("Hello from AI Code Editor!");

function greet(name) {
    return `Hello, ${name}!`;
}

console.log(greet("World"));
EOF

cat > "$WORKSPACE_DIR/test/README.md" << 'EOF'
# Test Project

This is a test project created by the AI Code Editor setup script.

## Features

- Real file operations
- Terminal access
- AI integration
- Live file watching

## Getting Started

1. Open files in the editor
2. Edit and save
3. Run commands in terminal
4. Chat with AI for help

Enjoy coding! 🚀
EOF

print_color "✅ Test files created" $GREEN

# Final instructions
echo ""
print_color "🎉 Setup Complete!" $GREEN
echo "=================================="
echo ""
print_color "📁 Workspace: $WORKSPACE_DIR" $BLUE
print_color "🤖 Ollama: $OLLAMA_HOST" $BLUE
echo ""

case $SETUP_MODE in
    "quick")
        print_color "🚀 To start the application:" $BLUE
        echo "  ./start.sh"
        echo ""
        print_color "🌐 Access your editor at:" $BLUE
        echo "  http://localhost:3000"
        ;;
    "docker")
        print_color "🐳 Docker containers are running:" $BLUE
        echo "  docker-compose ps"
        echo ""
        print_color "🌐 Access your editor at:" $BLUE
        echo "  http://localhost:3000"
        ;;
    "dev")
        print_color "🔧 To start development:" $BLUE
        echo "  npm run dev"
        echo ""
        print_color "🌐 Access your editor at:" $BLUE
        echo "  http://localhost:3000"
        ;;
    "prod")
        print_color "🚀 To start production:" $BLUE
        echo "  pm2 start ecosystem.config.js"
        echo ""
        print_color "🌐 Access your editor at:" $BLUE
        echo "  http://localhost:3000"
        ;;
esac

echo ""
print_color "📚 Documentation:" $BLUE
echo "  - Backend: backend/README.md"
echo "  - Frontend: README.md"
echo ""
print_color "🆘 Need help?" $BLUE
echo "  - Check logs: tail -f logs/app.log"
echo "  - Test backend: curl http://localhost:8080/api/health"
echo "  - Test Ollama: curl http://$OLLAMA_HOST/api/tags"
echo ""
print_color "🚀 Happy coding!" $GREEN 