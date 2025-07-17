# Start AI Code Editor
Write-Host "Starting AI Code Editor..." -ForegroundColor Cyan

# Install backend dependencies if needed
Write-Host "Checking backend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

# Start backend
Write-Host "Starting backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"

# Wait a moment for backend to start
Start-Sleep -Seconds 5

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "Servers started!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "Backend: http://localhost:8080" -ForegroundColor Blue
Write-Host ""
Write-Host "Close the PowerShell windows to stop the servers" -ForegroundColor Yellow
