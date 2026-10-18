# OpenFit launcher: double-click OpenFit.lnk (or OpenFit.cmd) to start everything.
# Close this window to stop the server.
#   -NoBrowser   start without opening a browser tab (e.g. for autostart at log-on)
param([switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "OpenFit server"

# Shared helpers (Say, Test-Url, Test-Command, Update-SessionPath, Test-InstallNeeded, Test-BuildNeeded…).
. (Join-Path $PSScriptRoot "setup\common.ps1")
. (Join-Path $PSScriptRoot "setup\app.ps1")
. (Join-Path $PSScriptRoot "setup\git.ps1")
. (Join-Path $PSScriptRoot "setup\certs.ps1")

# Shows an error and keeps the window open so it can be read.
function Fail($msg) {
    Write-Host ""; Say $msg Red
    Read-Host "  Press Enter to close"
    exit 1
}
# True if something is listening on the port.
function Test-Port($port) {
    [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

Write-Host ""
Write-Host "  OpenFit" -ForegroundColor Green
Write-Host ""

# HTTPS (needed for the iPhone's live camera) if mkcert certificates exist.
$https = (Test-Path "certs\key.pem") -and (Test-Path "certs\cert.pem")
$port = if ($https) { 3443 } else { 3000 }
$scheme = if ($https) { "https" } else { "http" }
$localUrl = "${scheme}://localhost:$port"

# Already running? Just open it.
if (Test-Port $port) {
    Say "Already running at $localUrl" Green
    if (-not $NoBrowser) { Start-Process $localUrl }
    Start-Sleep 2
    exit 0
}

# 1. First run (or something essential missing): run the one-click setup, then carry on.
if (-not (Test-Command node) -or -not (Test-Path ".env") -or -not (Test-Path "node_modules")) {
    Say "First run: setting everything up." Yellow
    & (Join-Path $PSScriptRoot "setup.ps1") -FromLauncher
    Update-SessionPath
    Set-Location $Root
    $Host.UI.RawUI.WindowTitle = "OpenFit server"
    if (-not (Test-Command node)) { Fail "Node.js isn't installed. Get it from https://nodejs.org and run this again." }
    # Certificates may have been created just now.
    $https = (Test-Path "certs\key.pem") -and (Test-Path "certs\cert.pem")
    $port = if ($https) { 3443 } else { 3000 }
    $scheme = if ($https) { "https" } else { "http" }
    $localUrl = "${scheme}://localhost:$port"
}
if (Test-InstallNeeded $Root) {
    Say "Updating packages..."
    npm install --no-fund --no-audit
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed (see above)." }
}

# PC got a new IP (new router, other network)? Refresh the certificate so the phone still connects.
if ($https) {
    $missing = Get-UncoveredAddresses $Root
    if ($missing.Count -gt 0) {
        Say "New address detected ($($missing -join ', ')); updating the HTTPS certificate..." Yellow
        Invoke-MakeCerts $Root | Out-Null
    }
}

# 2. Database
Say "Checking database..."
# Capture everything Prisma prints: it writes routine info ("Loaded Prisma config…")
# to stderr. Show it only if the command actually fails. EAP must be Continue here,
# or Windows PowerShell 5.1 turns any native stderr line into a terminating error.
$ErrorActionPreference = "Continue"
$prismaOut = npx prisma migrate deploy 2>&1 | ForEach-Object {
    # 5.1 wraps stderr lines in ErrorRecords; a blank one stringifies as "…RemoteException".
    if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" }
}
$prismaExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($prismaExit -ne 0) {
    $prismaOut | Where-Object { $_.Trim() } | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    Fail "Database setup failed (details above)."
}

# 3. Ollama (the AI coach): start the tray app if it isn't running.
if (Test-Url "http://127.0.0.1:11434/api/version") {
    Say "Ollama is running." Green
} else {
    $ollamaApp = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama app.exe"
    if (Test-Path $ollamaApp) {
        Say "Starting Ollama..."
        Start-Process $ollamaApp
        for ($i = 0; $i -lt 20 -and -not (Test-Url "http://127.0.0.1:11434/api/version"); $i++) { Start-Sleep 1 }
        if (Test-Url "http://127.0.0.1:11434/api/version") { Say "Ollama is running." Green }
        else { Say "Ollama didn't start. Everything except the AI coach will work." Yellow }
    } else {
        Say "Ollama isn't installed. Everything except the AI coach will work." Yellow
    }
}

# 4. Build only when the code changed since the last build (check shared with setup).
if (Test-BuildNeeded $Root) {
    Say "Building the app (takes ~30 seconds when the code has changed)..."
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "Build failed (see above)." }
}

# 5. Open the browser once the server answers, and show the iPhone address.
# Only adapters with a default gateway, i.e. your real LAN, not WSL/Hyper-V/VirtualBox adapters.
$lanIps = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Where-Object { $_ -notmatch '^(127\.|169\.254\.)' }
# Waits for the port to accept connections (works for http and https alike).
$opener = if (-not $NoBrowser) { Start-Job -ArgumentList $localUrl, $port -ScriptBlock {
    param($url, $port)
    for ($i = 0; $i -lt 90; $i++) {
        $c = New-Object System.Net.Sockets.TcpClient
        try { $c.Connect("127.0.0.1", $port); $c.Close(); Start-Sleep 1; Start-Process $url; return }
        catch { Start-Sleep 1 } finally { $c.Dispose() }
    }
} }

Write-Host ""
Say "On this PC:  $localUrl" Green
foreach ($ip in $lanIps) { Say "On iPhone:   ${scheme}://${ip}:$port  (home Wi-Fi)" Green }
# Tailscale: works from anywhere, as long as Tailscale is on on the phone.
$tsExe = "C:\Program Files\Tailscale\tailscale.exe"
if (Test-Path $tsExe) {
    try {
        $ts = & $tsExe status --json 2>$null | ConvertFrom-Json
        if ($ts.BackendState -eq "Running" -and $ts.Self.DNSName) {
            Say "Anywhere:    ${scheme}://$($ts.Self.DNSName.TrimEnd('.')):$port  (Tailscale)" Green
        }
    } catch { }
}
if (-not $https) { Say "(Live barcode scanning on iPhone needs HTTPS: see SETUP.md step 6.)" DarkGray }
Write-Host ""
Say "Close this window to stop OpenFit." Yellow
Write-Host ""

try {
    if ($https) { npm run start:https } else { npm start }
} finally {
    if ($opener) { Remove-Job $opener -Force -ErrorAction SilentlyContinue }
}
if ($LASTEXITCODE -ne 0) { Fail "The server stopped with an error (see above)." }
