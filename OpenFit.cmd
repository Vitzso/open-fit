@echo off
rem Double-click to start OpenFit (or use the OpenFit shortcut, which has the app icon).
rem Prefer PowerShell 7; fall back to Windows PowerShell. (Not "a && b || c": that would re-run
rem the script in Windows PowerShell whenever it exits with an error under PowerShell 7.)
where pwsh >nul 2>nul
if %errorlevel%==0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\launch.ps1" %*
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\launch.ps1" %*
)
