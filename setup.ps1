# AI Code Editor - Windows Setup Script
# This script sets up the complete AI code editor with real backend functionality

param(
    [string]$OllamaHost = "192.168.4.88:11434",
    [string]$WorkspaceDir = ".\workspace",
    [string]$SetupType = "quick"
)

Write-Host "AI Code Editor - Complete Setup (Windows)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Function to print colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Check prerequisites
Write-ColorOutput "Checking prerequisites..." "Blue"

# Check Node.js
try {
    $nodeVersion = node --version
    if ($nodeVersion -match "v(\d+)\.") {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -ge 18) {
            Write-ColorOutput "Node.js $nodeVersion found" "Green"
        } else {
            Write-ColorOutput "Node.js version $nodeVersion is too old. Please upgrade to Node.js 18+" "Red"
            exit 1
        }
    }
} catch {
    Write-ColorOutput "Node.js not found. Please install Node.js 18+" "Red"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-ColorOutput "npm $npmVersion found" "Green"
} catch {
    Write-ColorOutput "npm not found. Please install npm" "Red"
    exit 1
}

# Check Docker (optional)
try {
    $dockerVersion = docker --version
    Write-ColorOutput "Docker found - Docker deployment available" "Green"
    $dockerAvailable = $true
} catch {
    Write-ColorOutput "Docker not found - Manual setup only" "Yellow"
    $dockerAvailable = $false
}

# Ask for setup type if not provided
if (-not $SetupType) {
    Write-Host ""
    Write-ColorOutput "Setup Options:" "Blue"
    Write-Host "1. Quick Start (Recommended)"
    Write-Host "2. Docker Deployment"
    Write-Host "3. Development Setup"
    Write-Host "4. Production Setup"
    Write-Host ""
    
    $choice = Read-Host "Choose setup type (1-4)"
    switch ($choice) {
        "1" { $SetupType = "quick" }
        "2" { $SetupType = "docker" }
        "3" { $SetupType = "dev" }
        "4" { $SetupType = "prod" }
        default { $SetupType = "quick" }
    }
}

# Get user configuration
Write-Host ""
Write-ColorOutput "Configuration:" "Blue"

if (-not $OllamaHost) {
    $OllamaHost = Read-Host "Enter Ollama host (default: 192.168.4.88:11434)"
    if (-not $OllamaHost) { $OllamaHost = "192.168.4.88:11434" }
}

if (-not $WorkspaceDir) {
    $WorkspaceDir = Read-Host "Enter workspace directory (default: workspace)"
    if (-not $WorkspaceDir) { $WorkspaceDir = "workspace" }
}

# Create workspace directory
New-Item -ItemType Directory -Force -Path $WorkspaceDir | Out-Null

# Frontend setup
Write-Host ""
Write-ColorOutput "Setting up frontend..." "Blue"

# Install frontend dependencies
npm install

# Backend setup
Write-Host ""
Write-ColorOutput "Setting up backend..." "Blue"

# Create backend directory
New-Item -ItemType Directory -Force -Path "backend" | Out-Null

# Install backend dependencies
Set-Location backend
npm install

# Create .env file
$envContent = @"
# AI Code Editor Backend Configuration
PORT=8080
NODE_ENV=development
OLLAMA_HOST=$OllamaHost
WORKSPACE_DIR=$WorkspaceDir
CORS_ORIGINS=http://localhost:3000
REMOTE_SERVERS=[]
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-ColorOutput "Backend configured" "Green"

# Update frontend vite config
Set-Location ..
$viteConfig = @'
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
'@

$viteConfig | Out-File -FilePath "vite.config.ts" -Encoding UTF8

Write-ColorOutput "Frontend configured" "Green"

# Setup based on chosen mode
switch ($SetupType) {
    "quick" {
        Write-ColorOutput "Quick Start Setup" "Blue"
        
        # Test Ollama connection
        try {
            $response = Invoke-WebRequest -Uri "http://$OllamaHost/api/tags" -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-ColorOutput "Ollama connection successful" "Green"
            }
        } catch {
            Write-ColorOutput "Ollama connection failed - check host and port" "Yellow"
        }
        
        # Create start script
        $startScript = @'
# Start AI Code Editor
Write-Host "Starting AI Code Editor..." -ForegroundColor Cyan

# Start backend
Write-Host "Starting backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; node server.js"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "Servers started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "Backend: http://localhost:8080" -ForegroundColor Blue
Write-Host ""
Write-Host "Close the PowerShell windows to stop the servers" -ForegroundColor Yellow
'@
        
        $startScript | Out-File -FilePath "start.ps1" -Encoding UTF8
        
        Write-ColorOutput "Quick start setup complete!" "Green"
    }
    
    "docker" {
        if ($dockerAvailable) {
            Write-ColorOutput "Docker Setup" "Blue"
            
            # Build and start containers
            docker-compose up -d
            
            Write-ColorOutput "Docker containers started" "Green"
            Write-ColorOutput "Frontend: http://localhost:3000" "Blue"
            Write-ColorOutput "Backend: http://localhost:8080" "Blue"
        } else {
            Write-ColorOutput "Docker not available - switching to quick setup" "Red"
            $SetupType = "quick"
        }
    }
    
    "dev" {
        Write-ColorOutput "Development Setup" "Blue"
        
        # Install development dependencies
        npm install -D nodemon concurrently
        
        Write-ColorOutput "Development setup complete!" "Green"
    }
    
    "prod" {
        Write-ColorOutput "Production Setup" "Blue"
        
        # Install PM2 if not present
        try {
            pm2 --version | Out-Null
        } catch {
            Write-ColorOutput "Installing PM2..." "Blue"
            npm install -g pm2
        }
        
        # Create PM2 ecosystem file
        $ecosystemConfig = @'
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
'@
        
        $ecosystemConfig | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8
        
        # Create logs directory
        New-Item -ItemType Directory -Force -Path "logs" | Out-Null
        
        # Build frontend
        npm run build
        
        Write-ColorOutput "Production setup complete!" "Green"
    }
}

# Create test files
Write-ColorOutput "Creating test files..." "Blue"

$testPath = Join-Path $WorkspaceDir "test"
New-Item -ItemType Directory -Force -Path $testPath | Out-Null

$testJsContent = @'
// Test JavaScript file
console.log("Hello from AI Code Editor!");

function greet(name) {
    return `Hello, ${name}!`;
}

console.log(greet("World"));
'@

$testJsPath = Join-Path $testPath "hello.js"
$testJsContent | Out-File -FilePath $testJsPath -Encoding UTF8

$testReadmeContent = @'
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

Enjoy coding!
'@

$testReadmePath = Join-Path $testPath "README.md"
$testReadmeContent | Out-File -FilePath $testReadmePath -Encoding UTF8

Write-ColorOutput "Test files created" "Green"

# Final instructions
Write-Host ""
Write-ColorOutput "Setup Complete!" "Green"
Write-Host "=================================="
Write-Host ""
Write-ColorOutput "Workspace: $WorkspaceDir" "Blue"
Write-ColorOutput "Ollama: $OllamaHost" "Blue"
Write-Host ""

switch ($SetupType) {
    "quick" {
        Write-ColorOutput "To start the application:" "Blue"
        Write-Host "  .\start.ps1"
        Write-Host ""
        Write-ColorOutput "Access your editor at:" "Blue"
        Write-Host "  http://localhost:3000"
    }
    "docker" {
        Write-ColorOutput "Docker containers are running:" "Blue"
        Write-Host "  docker-compose ps"
        Write-Host ""
        Write-ColorOutput "Access your editor at:" "Blue"
        Write-Host "  http://localhost:3000"
    }
    "dev" {
        Write-ColorOutput "To start development:" "Blue"
        Write-Host "  npm run dev"
        Write-Host ""
        Write-ColorOutput "Access your editor at:" "Blue"
        Write-Host "  http://localhost:3000"
    }
    "prod" {
        Write-ColorOutput "To start production:" "Blue"
        Write-Host "  pm2 start ecosystem.config.js"
        Write-Host ""
        Write-ColorOutput "Access your editor at:" "Blue"
        Write-Host "  http://localhost:3000"
    }
}

Write-Host ""
Write-ColorOutput "Documentation:" "Blue"
Write-Host "  - Backend: backend\README.md"
Write-Host "  - Frontend: README.md"
Write-Host ""
Write-ColorOutput "Need help?" "Blue"
Write-Host "  - Check logs: Get-Content logs\app.log -Wait"
Write-Host "  - Test backend: Invoke-WebRequest http://localhost:8080/api/health"
Write-Host "  - Test Ollama: Invoke-WebRequest http://$OllamaHost/api/tags"
Write-Host ""
Write-ColorOutput "Happy coding!" "Green" 