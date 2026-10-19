@echo off
rem Checks OpenFit's files and installed parts and repairs anything that's out of step.
rem Prefer PowerShell 7; fall back to Windows PowerShell. (Not "a && b || c": that would re-run
rem the script in Windows PowerShell whenever it exits with an error under PowerShell 7.)
where pwsh >nul 2>nul
if %errorlevel%==0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\validate.ps1" %*
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\validate.ps1" %*
)
pause
