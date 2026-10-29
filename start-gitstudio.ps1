# GitStudio Desktop Launcher for PowerShell
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "                GitStudio Desktop Launcher                    " -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "Workspaces:"
Write-Host "  - GestaltCE:             c:\git" -ForegroundColor DarkGray
Write-Host "  - Tribernachi-Foundation: c:\git\trib" -ForegroundColor DarkGray
Write-Host "  - rickpeters112233:      c:\git\rick" -ForegroundColor DarkGray
Write-Host "Target Port: 8080 (bypassing 3000 and 7080)" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found in your system PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/"
    pause
    exit 1
}

# Install dependencies if missing
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/3] Dependencies not found. Running npm install..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
} else {
    Write-Host "[1/3] Dependencies verified." -ForegroundColor Green
}

# Open browser to Port 8080
Write-Host "[2/3] Opening browser at http://localhost:8080..." -ForegroundColor Yellow
Start-Process "http://localhost:8080"

# Start server
Write-Host "[3/3] Starting GitStudio server on Port 8080..." -ForegroundColor Green
Write-Host "(Press Ctrl+C to stop the server at any time)" -ForegroundColor DarkGray
Write-Host ""
npm run dev:8080
