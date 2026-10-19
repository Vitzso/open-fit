# Step: Node.js (runs the OpenFit server).
# Test-NodeReady is shared with launch.ps1 and validate.ps1.

# Oldest Node.js that runs OpenFit: prisma.config.ts uses process.loadEnvFile (Node 20.12+),
# and Next.js 15 / Prisma 6 need 18.18+ anyway.
$MinNodeVersion = [version]"20.12.0"

# Path of node.exe, or $null.
function Find-Node { Find-Program "node" @((Join-Path "$env:ProgramFiles" "nodejs\node.exe")) }

# Installed Node.js version as [version], or $null when Node.js isn't installed.
function Get-NodeVersion {
    $node = Find-Node
    if (-not $node) { return $null }
    # A node.exe found outside PATH still has to be usable by npm, so put its folder on PATH.
    $dir = Split-Path $node
    if (-not (($env:Path -split ';') -contains $dir)) { $env:Path = "$dir;$env:Path" }
    return ConvertTo-Version (& $node --version 2>$null)
}

# True when a new enough Node.js is installed.
function Test-NodeReady {
    $v = Get-NodeVersion
    return [bool]($v -and $v -ge $MinNodeVersion)
}

# Installs Node.js LTS if missing, or updates it if it's too old. Returns $true when node is ready.
function Install-Node {
    $v = Get-NodeVersion
    if ($v -and $v -ge $MinNodeVersion) { Say "Node.js $v is installed." Green; return $true }
    if ($v) {
        Say "Node.js $v is too old (OpenFit needs $MinNodeVersion or newer)." Yellow
        Install-Package "OpenJS.NodeJS.LTS" "Node.js LTS" -Upgrade | Out-Null
        # Not installed through winget (e.g. nvm or the nodejs.org installer)? Install the LTS package.
        $v = Get-NodeVersion
        if (-not ($v -and $v -ge $MinNodeVersion) -and (Test-Command winget)) {
            winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-source-agreements --accept-package-agreements --disable-interactivity | Out-Host
            Update-SessionPath
        }
    } else {
        Install-Package "OpenJS.NodeJS.LTS" "Node.js LTS" | Out-Null
    }
    $v = Get-NodeVersion
    if ($v -and $v -ge $MinNodeVersion) { Say "Node.js $v is installed." Green; return $true }
    if ($v) { Say "Node.js $v is still too old. Install the LTS from https://nodejs.org, then run Setup again." Red }
    else { Say "Node.js couldn't be installed. Get it from https://nodejs.org, then run Setup again." Red }
    return $false
}
