# OpenFit one-click setup. Double-click Setup.cmd (or run this file).
# Installs whatever is missing and skips whatever is already done, so it's also "repair".
#   -FromLauncher   called by launch.ps1 on first run: don't offer to start OpenFit at the end
#   -FromDesktop    called by the OpenFit desktop app, which opens itself when this window closes
#   -ProTraining yes|no   answer for the Pro training module (the desktop app's checkbox), instead of asking
# Every question comes first (passcode, Pro training, remote access); after that it runs by itself.
param([switch]$FromLauncher, [switch]$FromDesktop, [ValidateSet("", "yes", "no")][string]$ProTraining = "")
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "OpenFit setup"

foreach ($part in "common", "node", "git", "env", "app", "modules", "ollama", "remote", "certs", "shortcut") {
    . (Join-Path $PSScriptRoot "setup\$part.ps1")
}
Disable-QuickEdit

Write-Host ""
Write-Host "  OpenFit setup" -ForegroundColor Green
Say "Installs what's missing, skips what's already done. Safe to run again any time."

$results = [ordered]@{}
$total = 9

Step 1 $total "Node.js"
$results["Node.js"] = Install-Node
if (-not $results["Node.js"]) {
    Read-Host "  Press Enter to close"
    exit 1
}

Step 2 $total "OpenSSL (for HTTPS certificates)"
$results["OpenSSL"] = Install-OpenSsl

Step 3 $total "Settings, passcode and Pro training"
$model = Initialize-Env $Root
$proTrainingAnswer = Read-ProTrainingAnswer $Root $ProTraining
$results["Settings"] = $true

Step 4 $total "Remote access (optional: Tailscale, WireGuard, ZeroTier, NetBird...)"
$results["Remote access"] = Install-RemoteAccess $Root

Step 5 $total "AI coach (Ollama + $model)"
# The model download (several GB on a new PC) runs in the background during the next steps.
$ollama = Start-OllamaSetup $model

Step 6 $total "App packages, database and build"
$results["App"] = Install-App $Root
if (-not $results["App"]) {
    if ($ollama.Pull -and -not $ollama.Pull.HasExited) { Say "The AI model keeps downloading in the background." }
    Read-Host "  Press Enter to close"
    exit 1
}

Step 7 $total "Pro training module (optional)"
$results["Pro training"] = Install-ProTraining $Root -Answer $proTrainingAnswer

Step 8 $total "HTTPS certificates"
$results["HTTPS"] = Initialize-Certs $Root

Step 9 $total "Desktop shortcut"
# Run from the desktop app: name it so it reads clearly next to the app's "OpenFit Dashboard" shortcut.
$results["Shortcut"] = if ($FromDesktop) { Install-Shortcut $Root "OpenFit server" } else { Install-Shortcut $Root }

if ($ollama.Pull -and -not $ollama.Pull.HasExited) {
    Write-Host ""
    Say "Almost done: finishing the AI coach's model download." Cyan
}
$results["AI coach"] = Complete-Ollama $ollama $model

Write-Host ""
Write-Host "  Summary" -ForegroundColor Green
foreach ($k in $results.Keys) {
    if ($results[$k]) { Say "OK       $k" Green } else { Say "skipped  $k" Yellow }
}
Write-Host ""

if ($FromLauncher) { return }
if ($FromDesktop) {
    Say "To use OpenFit on your phone, start it with the ""OpenFit server"" shortcut on your Desktop."
    Read-Host "  Press Enter to close this window and open the OpenFit app"
    return
}
if (Ask-YesNo "Start OpenFit now?" $true) {
    Start-Process (Join-Path $Root "OpenFit.cmd")
}
