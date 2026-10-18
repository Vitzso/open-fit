# Shared helpers for the setup steps. Dot-sourced by setup.ps1 (and launch.ps1).
# Works in PowerShell 7 and Windows PowerShell 5.1.

# Prints an indented line in a colour.
function Say($msg, $color = "Gray") { Write-Host "  $msg" -ForegroundColor $color }

# Prints a step heading, e.g. "[3/9] Node.js".
function Step($n, $total, $title) { Write-Host ""; Write-Host "  [$n/$total] $title" -ForegroundColor Cyan }

# Asks a yes/no question; Enter picks the default.
function Ask-YesNo($question, [bool]$default = $true) {
    $hint = if ($default) { "Y/n" } else { "y/N" }
    $a = Read-Host "  $question [$hint]"
    if (-not $a) { return $default }
    return $a.Trim().ToLower().StartsWith("y")
}

# True if a command is on PATH.
function Test-Command($name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }

# True if a URL answers within 2 seconds.
function Test-Url($url) {
    try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2 | Out-Null; $true } catch { $false }
}

# Reloads PATH from the registry, so programs installed a moment ago are found without reopening the window.
function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

# Installs a package with winget (Windows' built-in installer). Returns $true on success.
function Install-Package($id, $label) {
    if (-not (Test-Command winget)) {
        Say "winget isn't available, so $label can't be installed automatically." Yellow
        return $false
    }
    Say "Installing $label (Windows may ask for permission)..."
    winget install --id $id --exact --silent --accept-source-agreements --accept-package-agreements --disable-interactivity | Out-Host
    # winget returns non-zero for "already installed" too; the caller re-checks with Test-Command.
    Update-SessionPath
    return $true
}

# .env is UTF-8 without a byte-order mark. Windows PowerShell 5.1's Get-Content/Set-Content would
# misread its dashes and add a BOM that hides the first setting, so read and write explicitly.
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false

# Reads KEY="value" from .env (or "" if missing).
function Get-EnvValue($file, $key) {
    if (-not (Test-Path $file)) { return "" }
    $line = [IO.File]::ReadAllLines($file, $Utf8NoBom) | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
    if (-not $line) { return "" }
    return ($line -replace "^\s*$key\s*=\s*", "").Trim().Trim('"')
}

# Writes KEY="value" in .env, replacing the existing line or appending one. Other lines are untouched.
function Set-EnvValue($file, $key, $value) {
    $escaped = $value.Replace('\', '\\').Replace('"', '\"')
    $newLine = "$key=`"$escaped`""
    $found = $false
    $lines = [IO.File]::ReadAllLines($file, $Utf8NoBom) | ForEach-Object {
        if ($_ -match "^\s*$key\s*=") { $found = $true; $newLine } else { $_ }
    }
    $lines = @($lines)
    if (-not $found) { $lines += $newLine }
    [IO.File]::WriteAllLines($file, [string[]]$lines, $Utf8NoBom)
}
