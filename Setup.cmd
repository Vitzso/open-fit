@echo off
rem One-click setup / repair for OpenFit: installs what's missing, skips what's done.
where pwsh >nul 2>nul && (pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\setup.ps1") || (powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\setup.ps1")
