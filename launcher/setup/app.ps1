# Step: the app itself — npm packages, database, production build.
# Test-BuildNeeded is shared with launch.ps1.

# Runs a native command quietly; shows its output only if it fails. Returns $true on success.
function Invoke-Quiet($label, [scriptblock]$command) {
    # EAP Continue: Windows PowerShell 5.1 turns native stderr lines into terminating errors otherwise.
    $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    $out = & $command 2>&1 | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" } }
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old
    if ($code -ne 0) {
        $out | Where-Object { "$_".Trim() } | Select-Object -Last 25 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        Say "$label failed (details above)." Red
        return $false
    }
    return $true
}

# True when packages are missing or package-lock.json changed since the last install.
function Test-InstallNeeded($root) {
    $marker = Join-Path $root "node_modules\.package-lock.json"
    if (-not (Test-Path $marker)) { return $true }
    return (Get-Item (Join-Path $root "package-lock.json")).LastWriteTime -gt (Get-Item $marker).LastWriteTime
}

# True when there's no build yet, or source files changed after the last one.
function Test-BuildNeeded($root) {
    $buildId = Join-Path $root ".next\BUILD_ID"
    if (-not (Test-Path $buildId)) { return $true }
    $built = (Get-Item $buildId).LastWriteTime
    $paths = "src", "prisma", "next.config.mjs", "package.json" | ForEach-Object { Join-Path $root $_ }
    $changed = Get-ChildItem $paths -Recurse -File |
        Where-Object { $_.LastWriteTime -gt $built -and $_.Extension -ne ".db" -and $_.Name -notlike "*.db-journal" } |
        Select-Object -First 1
    return [bool]$changed
}

# Installs packages, applies database migrations and builds, each only when needed.
function Install-App($root) {
    Push-Location $root
    try {
        if (Test-InstallNeeded $root) {
            Say "Installing packages (about a minute)..."
            if (-not (Invoke-Quiet "Installing packages" { npm install --no-fund --no-audit })) { return $false }
        }
        # Newer npm versions can skip install scripts; make sure the database client exists anyway.
        if (-not (Test-Path (Join-Path $root "node_modules\.prisma\client\index.js"))) {
            if (-not (Invoke-Quiet "Preparing the database client" { npx prisma generate })) { return $false }
        }
        Say "Packages are installed." Green

        if (-not (Invoke-Quiet "Database setup" { npx prisma migrate deploy })) { return $false }
        Say "Database is ready." Green

        if (Test-BuildNeeded $root) {
            Say "Building the app (about 30 seconds)..."
            if (-not (Invoke-Quiet "Build" { npm run build })) { return $false }
        }
        Say "App is built." Green
        return $true
    } finally { Pop-Location }
}
