@echo off
title GitStudio Desktop Launcher
color 0b

echo ==============================================================
echo                 GitStudio Desktop Launcher
echo ==============================================================
echo.
echo Workspaces:
echo   - GestaltCE:             c:\git
echo   - Tribernachi-Foundation: c:\git\trib
echo   - rickpeters112233:      c:\git\rick
echo.
echo Target Port: 8080 (bypassing 3000 and 7080)
echo ==============================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists, install if missing
if not exist "node_modules\" (
    echo [1/3] Dependencies not found. Running npm install...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        color 0c
        echo.
        echo [ERROR] npm install encountered an issue.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Dependencies verified.
)

:: Ensure Git repository tracking is initialized so 'git pull' works in this folder
if not exist ".git\" (
    echo [*] Initializing Git repository tracking for GitStudio Desktop...
    call git init >nul 2>nul
    call git remote add origin https://github.com/rickpeters112233/gitstudio-desktop.git >nul 2>nul
    call git fetch origin main >nul 2>nul
    call git branch -M main >nul 2>nul
    call git branch --set-upstream-to=origin/main main >nul 2>nul
    echo [*] Git tracking enabled! 'git pull origin main' will now work directly in this folder.
)

:: Wait 2 seconds and open browser to Port 8080
echo [2/3] Opening default browser to http://localhost:8080...
start "" "http://localhost:8080"

:: Start the application server on Port 8080
echo [3/3] Starting GitStudio Desktop server on Port 8080...
echo.
echo (Press Ctrl+C to stop the server at any time)
echo ==============================================================
echo.

call npm run dev:8080

if %errorlevel% neq 0 (
    echo.
    echo Server stopped with code %errorlevel%.
    pause
)
