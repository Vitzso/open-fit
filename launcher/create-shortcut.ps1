# Creates an "OpenFit" shortcut with the app icon that runs the launcher.
#   powershell -ExecutionPolicy Bypass -File launcher\create-shortcut.ps1            # in the project folder
#   powershell -ExecutionPolicy Bypass -File launcher\create-shortcut.ps1 -Desktop   # also on your Desktop
#   ... -StartMenu                                                                   # also in the Start menu
#   ... -Name "OpenFit server"                                                       # name of those two (default OpenFit)
param([switch]$Desktop, [switch]$StartMenu, [string]$Name = "OpenFit")
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$icon = Join-Path $PSScriptRoot "openfit.ico"
# Prefer PowerShell 7 via its stable app alias (the WindowsApps install path changes on every update).
$alias = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\pwsh.exe"
$pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
if (Test-Path $alias) { $ps = $alias }
elseif ($pwsh -and $pwsh.Source -notlike "*\WindowsApps\Microsoft.PowerShell_*") { $ps = $pwsh.Source }
else { $ps = (Get-Command powershell).Source }

$targets = @(Join-Path $Root "OpenFit.lnk")
if ($Desktop) { $targets += Join-Path ([Environment]::GetFolderPath("Desktop")) "$Name.lnk" }
if ($StartMenu) { $targets += Join-Path ([Environment]::GetFolderPath("Programs")) "$Name.lnk" }

$shell = New-Object -ComObject WScript.Shell
foreach ($path in $targets) {
    $lnk = $shell.CreateShortcut($path)
    $lnk.TargetPath = $ps
    $lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'launch.ps1')`""
    $lnk.WorkingDirectory = $Root
    $lnk.IconLocation = "$icon,0"
    $lnk.Description = "Start OpenFit (workouts, nutrition and AI coach)"
    $lnk.Save()
    Write-Host "Created $path"
}
