@echo off
title GitStudio Desktop - Pull All Workspaces
color 0b

echo ==============================================================
echo        GitStudio Desktop - 1-Click Workspace Pull All
echo ==============================================================
echo Workspaces:
echo   - GestaltCE:              C:\git
echo   - Tribernachi-Foundation:  C:\git\trib
echo   - rickpeters112233:       C:\git\rick
echo Reports:                    C:\git\reports
echo ==============================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0pull-all-workspaces.ps1"

if %errorlevel% neq 0 (
    echo.
    echo Script completed with exit code %errorlevel%.
    pause
)
