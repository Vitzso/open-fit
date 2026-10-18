# OpenFit one-click setup. Double-click Setup.cmd (or run this file).
# Installs whatever is missing and skips whatever is already done, so it's also "repair".
#   -FromLauncher   called by launch.ps1 on first run: don't offer to start OpenFit at the end
param([switch]$FromLauncher)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "OpenFit setup"

foreach ($part in "common", "node", "git", "env", "app", "ollama", "tailscale", "certs", "shortcut") {
    . (Join-Path $PSScriptRoot "setup\$part.ps1")
}

Write-Host ""
Write-Host "  OpenFit setup" -ForegroundColor Green
Say "Installs what's missing, skips what's already done. Safe to run again any time."

$results = [ordered]@{}
$total = 8

Step 1 $total "Node.js"
$results["Node.js"] = Install-Node
if (-not $results["Node.js"]) {
    Read-Host "  Press Enter to close"
    exit 1
}

Step 2 $total "OpenSSL (for HTTPS certificates)"
$results["OpenSSL"] = Install-OpenSsl

Step 3 $total "Settings and passcode"
$model = Initialize-Env $Root
$results["Settings"] = $true

Step 4 $total "App packages, database and build"
$results["App"] = Install-App $Root
if (-not $results["App"]) {
    Read-Host "  Press Enter to close"
    exit 1
}

Step 5 $total "AI coach (Ollama + $model)"
$results["AI coach"] = Install-Ollama $model

Step 6 $total "Remote access (Tailscale, optional)"
$results["Tailscale"] = Install-Tailscale

Step 7 $total "HTTPS certificates"
$results["HTTPS"] = Initialize-Certs $Root

Step 8 $total "Desktop shortcut"
$results["Shortcut"] = Install-Shortcut $Root

Write-Host ""
Write-Host "  Summary" -ForegroundColor Green
foreach ($k in $results.Keys) {
    if ($results[$k]) { Say "OK       $k" Green } else { Say "skipped  $k" Yellow }
}
Write-Host ""

if ($FromLauncher) { return }
if (Ask-YesNo "Start OpenFit now?" $true) {
    Start-Process (Join-Path $Root "OpenFit.cmd")
}
