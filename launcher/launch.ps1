# OpenFit launcher: double-click OpenFit.lnk (or OpenFit.cmd) to start everything.
# Close this window to stop the server.
#   -NoBrowser   start without opening a browser tab (e.g. for autostart at log-on)
#   -Headless    run by the OpenFit desktop app in a hidden window: no browser and no questions; it reads
#                the OPENFIT-URL / OPENFIT-PHONE / OPENFIT-READY / OPENFIT-ERROR lines this prints
param([switch]$NoBrowser, [switch]$Headless)
if ($Headless) { $NoBrowser = $true }
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "OpenFit server"

# Shared helpers (Say, Test-Url, Test-NodeReady, Test-InstallNeeded, Test-BuildNeeded, Initialize-Certs...).
foreach ($part in "common", "node", "app", "modules", "git", "remote", "certs", "ollama") {
    . (Join-Path $PSScriptRoot "setup\$part.ps1")
}
Disable-QuickEdit

# Shows an error and keeps the window open so it can be read (or, for the desktop app, reports it).
function Fail($msg) {
    if ($Headless) { Write-Output "OPENFIT-ERROR $msg"; exit 1 }
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

# HTTPS (needed for the iPhone's live camera) when certificates exist. Initialize-Certs re-issues
# them first if they expired, the PC's address changed, or key.pem and cert.pem don't match
# (starting the server with a mismatched pair would crash it).
$https = $false
if ((Test-Path "certs\key.pem") -or (Test-Path "certs\cert.pem")) {
    $https = (Initialize-Certs $Root) -and (Test-Path "certs\key.pem") -and (Test-Path "certs\cert.pem")
}
$port = if ($https) { 3443 } else { 3000 }
$scheme = if ($https) { "https" } else { "http" }
$localUrl = "${scheme}://localhost:$port"

# Already running? Just open it.
if (Test-Port $port) {
    if ($Headless) { Write-Output "OPENFIT-READY $localUrl"; exit 0 }
    Say "Already running at $localUrl" Green
    if (-not $NoBrowser) { Start-Process $localUrl }
    Start-Sleep 2
    exit 0
}

# 1. First run (or something essential missing): run the one-click setup, then carry on.
if (-not (Test-NodeReady) -or -not (Test-Path ".env") -or -not (Test-Path "node_modules")) {
    if ($Headless) { Fail "OpenFit isn't set up yet: run Setup." }
    Say "First run: setting everything up." Yellow
    & (Join-Path $PSScriptRoot "setup.ps1") -FromLauncher
    Update-SessionPath
    Set-Location $Root
    $Host.UI.RawUI.WindowTitle = "OpenFit server"
    if (-not (Test-NodeReady)) { Fail "Node.js $MinNodeVersion or newer isn't installed. Get it from https://nodejs.org and run this again." }
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
    Set-InstallDone $Root
}
if (Test-PrismaClientStale $Root) {
    if (-not (Invoke-Quiet "Preparing the database client" { npx prisma generate })) { Fail "Preparing the database client failed." }
}

# 2. Database
Say "Checking database..."
# Capture everything Prisma prints: it writes routine info ("Loaded Prisma config...")
# to stderr. Show it only if the command actually fails. EAP must be Continue here,
# or Windows PowerShell 5.1 turns any native stderr line into a terminating error.
$ErrorActionPreference = "Continue"
$prismaOut = npx prisma migrate deploy 2>&1 | ForEach-Object {
    # 5.1 wraps stderr lines in ErrorRecords; a blank one stringifies as "...RemoteException".
    if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" }
}
$prismaExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($prismaExit -ne 0) {
    $prismaOut | Where-Object { $_.Trim() } | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    Fail "Database setup failed (details above)."
}

# Updated from a version without Pro training? Offer it once (not on a silent start at log-on).
if (-not $NoBrowser) { Install-ProTraining $Root -Once | Out-Null }

# 3. Ollama (the AI coach): start the tray app if it isn't running.
if (Test-Url "$OllamaApi/api/version") {
    Say "Ollama is running." Green
} elseif (Test-OllamaInstalled) {
    Say "Starting Ollama..."
    if (Start-Ollama 20) { Say "Ollama is running." Green }
    else { Say "Ollama didn't start. Everything except the AI coach will work." Yellow }
} else {
    Say "Ollama isn't installed. Everything except the AI coach will work." Yellow
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
# Remote access (Tailscale, WireGuard, ZeroTier, NetBird or your own): works from anywhere while
# the phone is on that network. A name reads better than an IP, so it's shown first.
$remoteCfg = Get-RemoteConfig $Root
if ($remoteCfg.Provider -ne "none") {
    $remote = Get-RemoteAddresses $Root
    $away = @($remote.Names) + @($remote.Ips) | Select-Object -First 1
    if ($away) { Say "Anywhere:    ${scheme}://${away}:$port  ($($remoteCfg.Label))" Green }
    elseif ($remoteCfg.Explicit) { Say "($($remoteCfg.Label) isn't connected, so OpenFit works on home Wi-Fi only right now.)" DarkGray }
}
if (-not $https) { Say "(Live barcode scanning on iPhone needs HTTPS: see SETUP.md step 6.)" DarkGray }
# The same addresses for the dashboard's Connection card (signed-in pages only).
$addresses = @("$localUrl|This PC") + @($lanIps | ForEach-Object { "${scheme}://${_}:$port|Phone on home Wi-Fi" })
if ($remoteCfg.Provider -ne "none" -and $away) { $addresses += "${scheme}://${away}:$port|Phone anywhere ($($remoteCfg.Label))" }
$env:OPENFIT_ADDRESSES = $addresses -join ";"
if ($Headless) {
    Write-Output "OPENFIT-URL $localUrl"
    foreach ($ip in $lanIps) { Write-Output "OPENFIT-PHONE ${scheme}://${ip}:$port home Wi-Fi" }
    if ($remoteCfg.Provider -ne "none" -and $away) { Write-Output "OPENFIT-PHONE ${scheme}://${away}:$port $($remoteCfg.Label)" }
}
Write-Host ""
Say "Close this window to stop OpenFit." Yellow
Write-Host ""

try {
    if ($https) { npm run start:https } else { npm start }
} finally {
    if ($opener) { Remove-Job $opener -Force -ErrorAction SilentlyContinue }
}
if ($LASTEXITCODE -ne 0) { Fail "The server stopped with an error (see above)." }
