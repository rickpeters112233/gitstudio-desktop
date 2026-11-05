@echo off
REM ============================================================
REM RUN_GUI.bat — run the Git Tools GUI directly (no exe needed)
REM ============================================================
cd /d "%~dp0"
python -m pip install requests --quiet
start "" pythonw git_tools_gui.py
