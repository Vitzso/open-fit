# Step: the app itself - npm packages, database, production build.
# Test-InstallNeeded, Test-PrismaClientStale and Test-BuildNeeded are shared with launch.ps1 and validate.ps1.

# Runs a native command quietly; shows its output only if it fails. Returns $true on success.
function Invoke-Quiet($label, [scriptblock]$command) {
    $r = Invoke-Native $command
    if ($r.ExitCode -ne 0) {
        $r.Output | Where-Object { "$_".Trim() } | Select-Object -Last 25 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        Say "$label failed (details above)." Red
        return $false
    }
    return $true
}

# Names of the packages listed in package.json that aren't in node_modules.
function Get-MissingPackages($root) {
    $pkg = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
    $names = @()
    foreach ($section in $pkg.dependencies, $pkg.devDependencies) {
        if ($section) { $names += $section.PSObject.Properties.Name }
    }
    return @($names | Where-Object { -not (Test-Path (Join-Path $root "node_modules\$_\package.json")) })
}

# True when packages are missing or package.json / package-lock.json changed since the last install.
function Test-InstallNeeded($root) {
    $marker = Join-Path $root "node_modules\.package-lock.json"
    if (-not (Test-Path $marker)) { return $true }
    $installed = (Get-Item $marker).LastWriteTime
    foreach ($f in "package-lock.json", "package.json") {
        $p = Join-Path $root $f
        if ((Test-Path $p) -and (Get-Item $p).LastWriteTime -gt $installed) { return $true }
    }
    return (Get-MissingPackages $root).Count -gt 0
}

# Records that packages match package.json now. npm leaves its marker untouched when everything is
# "up to date", so without this a newer package.json (an update) would reinstall on every start.
function Set-InstallDone($root) {
    $marker = Join-Path $root "node_modules\.package-lock.json"
    if (Test-Path $marker) { (Get-Item $marker).LastWriteTime = Get-Date }
}

# True when the generated database client is missing or was made from an older prisma\schema.prisma.
function Test-PrismaClientStale($root) {
    $client = Join-Path $root "node_modules\.prisma\client\index.js"
    if (-not (Test-Path $client)) { return $true }
    # Prisma reformats the copy of the schema it keeps, so compare times rather than text.
    return (Get-Item (Join-Path $root "prisma\schema.prisma")).LastWriteTime -gt (Get-Item $client).LastWriteTime
}

# True when there's no build yet, or source files changed after the last one.
function Test-BuildNeeded($root) {
    $buildId = Join-Path $root ".next\BUILD_ID"
    if (-not (Test-Path $buildId)) { return $true }
    $built = (Get-Item $buildId).LastWriteTime
    $paths = "src", "prisma", "next.config.mjs", "package.json", "postcss.config.mjs", "tsconfig.json" |
        ForEach-Object { Join-Path $root $_ } | Where-Object { Test-Path $_ }
    $changed = Get-ChildItem $paths -Recurse -File |
        Where-Object { $_.LastWriteTime -gt $built -and $_.Extension -ne ".db" -and $_.Name -notlike "*.db-journal" } |
        Select-Object -First 1
    return [bool]$changed
}

# Installs packages, prepares the database client, applies migrations and builds, each only when needed.
function Install-App($root) {
    Push-Location $root
    try {
        if (Test-InstallNeeded $root) {
            $missing = Get-MissingPackages $root
            if ($missing.Count -gt 0 -and (Test-Path (Join-Path $root "node_modules"))) {
                Say "Missing packages: $($missing -join ', ')." Yellow
            }
            Say "Installing packages (about a minute)..."
            if (-not (Invoke-Quiet "Installing packages" { npm install --no-fund --no-audit })) { return $false }
            Set-InstallDone $root
        } else {
            Say "Packages are already installed; skipping npm install."
        }
        # Newer npm versions can skip install scripts, and a schema change needs a fresh client.
        if (Test-PrismaClientStale $root) {
            if (-not (Invoke-Quiet "Preparing the database client" { npx prisma generate })) { return $false }
        }
        Say "Packages are installed." Green

        if (-not (Invoke-Quiet "Database setup" { npx prisma migrate deploy })) { return $false }
        Say "Database is ready." Green

        if (Test-BuildNeeded $root) {
            Say "Building the app (about 30 seconds)..."
            if (-not (Invoke-Quiet "Build" { npm run build })) { return $false }
        } else {
            Say "The build is up to date; skipping it."
        }
        Say "App is built." Green
        return $true
    } finally { Pop-Location }
}
