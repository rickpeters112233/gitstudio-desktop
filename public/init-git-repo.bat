@echo off
title Initialize GitStudio Git Tracking
color 0b

echo ==============================================================
echo        GitStudio Desktop - Initialize Git Repository
echo ==============================================================
echo Target Directory: %~dp0
echo Remote: https://github.com/rickpeters112233/gitstudio-desktop.git
echo ==============================================================
echo.

cd /d "%~dp0"

echo [1/4] Initializing Git repository...
call git init
if %errorlevel% neq 0 (
    echo [ERROR] Git command failed. Is Git installed on your system?
    pause
    exit /b 1
)

echo [2/4] Setting remote origin...
call git remote remove origin >nul 2>nul
call git remote add origin https://github.com/rickpeters112233/gitstudio-desktop.git

echo [3/4] Fetching latest branches from GitHub...
call git fetch origin main

echo [4/4] Setting branch tracking to origin/main...
call git branch -M main
call git branch --set-upstream-to=origin/main main

echo.
echo ==============================================================
echo [SUCCESS] GitStudio is now connected to Git!
echo You can now run "git pull origin main" directly in this folder.
echo ==============================================================
echo.
pause
