# Step (optional): Tailscale, for using OpenFit away from home.

$TailscaleExe = "C:\Program Files\Tailscale\tailscale.exe"

# True if Tailscale is installed (at its usual place, on PATH, or according to winget).
function Test-TailscaleInstalled {
    if (Test-Path $TailscaleExe) { return $true }
    $cli = Find-Program "tailscale"
    if ($cli) { $script:TailscaleExe = $cli; return $true }
    return $false
}

# Offers to install Tailscale if it's missing, and opens it if it isn't connected.
function Install-Tailscale {
    if (-not (Test-TailscaleInstalled)) {
        if (-not (Ask-YesNo "Install Tailscale so OpenFit works away from home too?" $false)) {
            Say "Skipped. OpenFit will work on your home Wi-Fi." Gray
            return $false
        }
        Install-Package "Tailscale.Tailscale" "Tailscale" | Out-Null
        if (-not (Test-TailscaleInstalled)) { Say "Tailscale wasn't installed." Yellow; return $false }
        Say "Installed. Sign in from the Tailscale icon, and install Tailscale on your iPhone with the same account." Yellow
    } else {
        Say "Tailscale is installed." Green
    }
    try {
        $state = (& $TailscaleExe status --json 2>$null | ConvertFrom-Json).BackendState
    } catch { $state = "" }
    if ($state -eq "Running") { Say "Tailscale is connected." Green; return $true }
    # Stuck in "starting" usually just means the tray app isn't open.
    $ipn = Join-Path (Split-Path $TailscaleExe) "tailscale-ipn.exe"
    if (Test-Path $ipn) { Start-Process $ipn }
    Say "Tailscale isn't connected yet. Sign in from its tray icon if asked." Yellow
    return $false
}
