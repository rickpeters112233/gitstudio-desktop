@echo off
REM ============================================================
REM BUILD_EXE.bat — builds GitToolsGUI.exe
REM Run once from C:\tools\gittools\
REM ============================================================
echo.
echo  Building GitToolsGUI.exe ...
echo.

python --version >nul 2>&1
if errorlevel 1 ( echo [ERROR] Python not found - install from python.org & pause & exit /b 1 )

python -m pip install pyinstaller requests --quiet

python -m PyInstaller --onefile --windowed --name "GitToolsGUI" git_tools_gui.py
if errorlevel 1 ( echo [ERROR] Build failed. & pause & exit /b 1 )

copy /Y dist\GitToolsGUI.exe .

echo.
echo  Done!  GitToolsGUI.exe is in this folder. Double-click it to open.
echo.
pause
