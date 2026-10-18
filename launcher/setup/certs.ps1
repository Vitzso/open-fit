# Step: HTTPS certificates (the iPhone needs HTTPS for the live camera and to install the app).
# Also re-issues the certificate when the PC's address changes; the phone keeps trusting it,
# because the certificate authority stays the same.

$TailscaleCli = "C:\Program Files\Tailscale\tailscale.exe"

# This PC's current addresses: LAN IPv4 (adapters with a gateway) plus the Tailscale IPv4 when connected.
function Get-PcAddresses {
    $ips = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
        ForEach-Object { $_.IPv4Address.IPAddress })
    if (Test-Path $TailscaleCli) {
        try {
            $ts = & $TailscaleCli status --json 2>$null | ConvertFrom-Json
            if ($ts.BackendState -eq "Running") { $ips += @($ts.Self.TailscaleIPs | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' }) }
        } catch { }
    }
    return @($ips | Where-Object { $_ } | Select-Object -Unique)
}

# Addresses the current certificate doesn't cover yet (empty when it's up to date or can't be read).
function Get-UncoveredAddresses($root) {
    $cert = Join-Path $root "certs\cert.pem"
    $openssl = Find-OpenSsl
    if (-not (Test-Path $cert) -or -not $openssl) { return @() }
    $san = (& $openssl x509 -in $cert -noout -ext subjectAltName 2>$null) -join " "
    if (-not $san) { return @() }
    return @(Get-PcAddresses | Where-Object { $san -notmatch "IP Address:$([regex]::Escape($_))(\s|,|$)" })
}

# Runs make-certs.ps1. Returns $true on success.
function Invoke-MakeCerts($root) {
    try { & (Join-Path $root "launcher\make-certs.ps1") | Out-Host; return $true }
    catch { Say "Certificate creation failed: $($_.Exception.Message)" Red; return $false }
}

# Creates certificates if missing, or refreshes them if the PC's address changed. Returns $true when HTTPS is ready.
function Initialize-Certs($root) {
    $cert = Join-Path $root "certs\cert.pem"
    if (-not (Find-OpenSsl)) {
        if (Test-Path $cert) { Say "HTTPS certificates exist." Green; return $true }
        Say "Skipping HTTPS (no OpenSSL). The app will use plain HTTP." Yellow
        return $false
    }
    if (-not (Test-Path $cert)) {
        Say "Creating HTTPS certificates..."
        if (-not (Invoke-MakeCerts $root)) { return $false }
        Say "HTTPS is ready. On the iPhone, open /ca.crt once to trust it (see SETUP.md)." Green
        return $true
    }
    $missing = Get-UncoveredAddresses $root
    if ($missing.Count -gt 0) {
        Say "This PC's address changed ($($missing -join ', ')). Updating the certificate; nothing to redo on the phone."
        if (-not (Invoke-MakeCerts $root)) { return $false }
    }
    Say "HTTPS certificates are up to date." Green
    return $true
}
