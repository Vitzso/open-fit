@echo off
rem Double-click to start OpenFit (or use the OpenFit shortcut, which has the app icon).
where pwsh >nul 2>nul && (pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\launch.ps1") || (powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\launch.ps1")
