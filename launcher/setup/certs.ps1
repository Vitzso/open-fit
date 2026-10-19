# Step: HTTPS certificates (the iPhone needs HTTPS for the live camera and to install the app).
# Also re-issues the certificate when the PC's address changes, when it's about to expire, or
# when the files don't belong together; the phone keeps trusting it, because the certificate
# authority stays the same. Get-CertProblem is shared with launch.ps1 and validate.ps1.

# Needs remote.ps1 (Get-RemoteAddresses) dot-sourced as well.
# Re-issue the server certificate this long before it expires (it's valid for 800 days).
$CertRenewDays = 30

# This PC's current addresses: LAN IPv4 (adapters with a gateway) plus its addresses on the
# remote-access network (Tailscale, WireGuard, ZeroTier, NetBird or REMOTE_ADDRESS).
function Get-PcAddresses($root) {
    $ips = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
        ForEach-Object { $_.IPv4Address.IPAddress } |
        Where-Object { $_ -notmatch '^(127\.|169\.254\.)' })
    $ips += @((Get-RemoteAddresses $root).Ips)
    return @($ips | Where-Object { $_ } | Select-Object -Unique)
}

# Addresses and names the current certificate doesn't cover yet (empty when it's up to date or can't be read).
function Get-UncoveredAddresses($root) {
    $cert = Join-Path $root "certs\cert.pem"
    $openssl = Find-OpenSsl
    if (-not (Test-Path $cert) -or -not $openssl) { return @() }
    $r = Invoke-OpenSsl $openssl @("x509", "-in", $cert, "-noout", "-ext", "subjectAltName")
    $san = $r.Output -join " "
    if ($r.ExitCode -ne 0 -or -not $san) { return @() }
    $ips = @(Get-PcAddresses $root | Where-Object { $san -notmatch "IP Address:$([regex]::Escape($_))(\s|,|$)" })
    $names = @((Get-RemoteAddresses $root).Names | Where-Object { $san -notmatch "DNS:$([regex]::Escape($_))(\s|,|$)" })
    return @($ips + $names)
}

# Why the HTTPS files need re-issuing, or $null when they're fine (or there's no OpenSSL to check with).
#   "missing"    no server certificate or key yet
#   "ca"         the certificate authority files are incomplete
#   anything else: a readable reason (expired, mismatched key, not signed by our CA, new address)
function Get-CertProblem($root) {
    $dir = Join-Path $root "certs"
    $cert = Join-Path $dir "cert.pem"; $key = Join-Path $dir "key.pem"
    $caCrt = Join-Path $dir "rootCA.pem"; $caKey = Join-Path $dir "rootCA-key.pem"
    if (-not (Test-Path $cert) -and -not (Test-Path $key)) { return "missing" }
    if ((Test-Path $caCrt) -ne (Test-Path $caKey)) { return "ca" }
    if (-not (Test-Path $cert)) { return "the certificate (cert.pem) is missing but its key is there" }
    if (-not (Test-Path $key)) { return "the key (key.pem) is missing but the certificate is there" }

    $openssl = Find-OpenSsl
    if (-not $openssl) { return $null }
    if ((Invoke-OpenSsl $openssl @("x509", "-in", $cert, "-noout")).ExitCode -ne 0) { return "cert.pem can't be read" }
    if ((Invoke-OpenSsl $openssl @("pkey", "-in", $key, "-noout")).ExitCode -ne 0) { return "key.pem can't be read" }
    $certPub = (Invoke-OpenSsl $openssl @("x509", "-in", $cert, "-noout", "-pubkey")).Output -join "`n"
    $keyPub = (Invoke-OpenSsl $openssl @("pkey", "-in", $key, "-pubout")).Output -join "`n"
    if ($certPub -ne $keyPub) { return "key.pem doesn't belong to cert.pem" }
    if ((Invoke-OpenSsl $openssl @("x509", "-in", $cert, "-noout", "-checkend", "$($CertRenewDays * 86400)")).ExitCode -ne 0) {
        return "the certificate expires within $CertRenewDays days (or already has)"
    }
    if ((Test-Path $caCrt) -and (Invoke-OpenSsl $openssl @("verify", "-CAfile", $caCrt, $cert)).ExitCode -ne 0) {
        return "the certificate isn't signed by this PC's certificate authority"
    }
    $missing = Get-UncoveredAddresses $root
    if ($missing.Count -gt 0) { return "this PC's address changed ($($missing -join ', '))" }
    return $null
}

# Runs make-certs.ps1. Returns $true on success.
function Invoke-MakeCerts($root, [switch]$NewAuthority) {
    try {
        if ($NewAuthority) { & (Join-Path $root "launcher\make-certs.ps1") -NewAuthority | Out-Host }
        else { & (Join-Path $root "launcher\make-certs.ps1") | Out-Host }
        return $true
    } catch { Say "Certificate creation failed: $($_.Exception.Message)" Red; return $false }
}

# Creates certificates if missing, or refreshes them when they need it. Returns $true when HTTPS is ready.
function Initialize-Certs($root) {
    $problem = Get-CertProblem $root
    if (-not (Find-OpenSsl)) {
        if (-not $problem) { Say "HTTPS certificates exist (no OpenSSL to check them)." Green; return $true }
        Say "Skipping HTTPS (no OpenSSL). The app will use plain HTTP." Yellow
        return $false
    }
    if ($problem -eq "missing") {
        Say "Creating HTTPS certificates..."
        if (-not (Invoke-MakeCerts $root)) { return $false }
        Say "HTTPS is ready. On the iPhone, open /ca.crt once to trust it (see SETUP.md)." Green
        return $true
    }
    if ($problem -eq "ca") {
        Say "The certificate authority files are incomplete; making a new one." Yellow
        if (-not (Invoke-MakeCerts $root -NewAuthority)) { return $false }
        Say "On the iPhone, open /ca.crt again and trust the new certificate (see SETUP.md)." Yellow
        return $true
    }
    if ($problem) {
        Say "Updating the HTTPS certificate: $problem. Nothing to redo on the phone."
        if (-not (Invoke-MakeCerts $root)) { return $false }
    }
    Say "HTTPS certificates are up to date." Green
    return $true
}
