# AI Code Editor Desktop App Startup Script
# This script starts both the backend and frontend for the desktop app

Write-Host "🚀 Starting AI Code Editor Desktop App..." -ForegroundColor Green

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Check if backend directory exists
if (!(Test-Path "backend")) {
    Write-Host "❌ Backend directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Check if backend dependencies are installed
if (!(Test-Path "backend/node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

# Check if frontend dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if .env file exists in backend
if (!(Test-Path "backend/.env")) {
    Write-Host "📝 Creating backend .env file..." -ForegroundColor Yellow
    Copy-Item "backend/env.example" "backend/.env"
    Write-Host "✅ Created backend/.env file. Please edit it to configure your Ollama endpoint." -ForegroundColor Green
}

# Start backend in background
Write-Host "🔧 Starting backend server..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start" -WindowStyle Minimized

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start desktop app
Write-Host "🖥️ Starting desktop app..." -ForegroundColor Blue
npm run electron-dev

Write-Host "✅ AI Code Editor Desktop App started!" -ForegroundColor Green 