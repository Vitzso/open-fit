# Creates HTTPS certificates so the iPhone can use the live camera and install the app.
#   pwsh -File launcher\make-certs.ps1            # uses this PC's LAN IP(s)
#   pwsh -File launcher\make-certs.ps1 -Ip 192.168.1.50
#
# Makes a private certificate authority (certs\rootCA.pem, installed once on the iPhone)
# and a server certificate signed by it (certs\cert.pem + key.pem, used by the launcher).
# Re-running keeps the existing authority, so after an IP change you don't need to
# reinstall anything on the phone. Uses the OpenSSL that ships with Git for Windows.
# Nothing is added to Windows' own trust store.
param([string[]]$Ip)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$certs = Join-Path $Root "certs"
New-Item -ItemType Directory -Force $certs | Out-Null

$openssl = (Get-Command openssl -ErrorAction SilentlyContinue).Source
if (-not $openssl) {
    $git = (Get-Command git -ErrorAction SilentlyContinue).Source
    if ($git) { $openssl = Join-Path (Split-Path (Split-Path $git)) "usr\bin\openssl.exe" }
}
if (-not $openssl -or -not (Test-Path $openssl)) { throw "OpenSSL not found. Install Git for Windows (it includes OpenSSL)." }

if (-not $Ip) {
    $Ip = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
        ForEach-Object { $_.IPv4Address.IPAddress }
}
if (-not $Ip) { throw "Couldn't detect a LAN IP address. Pass one with -Ip." }

# Tailscale (remote access from anywhere): add this PC's tailnet IP and MagicDNS name.
$tsNames = @()
$tsExe = "C:\Program Files\Tailscale\tailscale.exe"
if (Test-Path $tsExe) {
    try {
        $ts = & $tsExe status --json 2>$null | ConvertFrom-Json
        if ($ts.BackendState -eq "Running") {
            $Ip += @($ts.Self.TailscaleIPs | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' })
            if ($ts.Self.DNSName) { $tsNames += $ts.Self.DNSName.TrimEnd(".") }
        } else { Write-Host "Tailscale isn't connected; certificate will cover the LAN only." -ForegroundColor Yellow }
    } catch { }
}
# Extra addresses from ALLOWED_HOSTS in .env (names or IPs), e.g. a port-forward or your own DNS name.
$envFile = Join-Path $Root ".env"
if (Test-Path $envFile) {
    $line = [IO.File]::ReadAllLines($envFile) | Where-Object { $_ -match '^\s*ALLOWED_HOSTS\s*=' } | Select-Object -First 1
    if ($line) {
        foreach ($h in (($line -replace '^\s*ALLOWED_HOSTS\s*=\s*', '').Trim().Trim('"') -split ',')) {
            $h = $h.Trim()
            if (-not $h) { continue }
            if ($h -match '^\d+\.\d+\.\d+\.\d+$') { $Ip += $h } else { $tsNames += $h }
        }
    }
}
$Ip = $Ip | Select-Object -Unique

$caKey = Join-Path $certs "rootCA-key.pem"
$caCrt = Join-Path $certs "rootCA.pem"
$tmp = New-Item -ItemType Directory -Force (Join-Path ([IO.Path]::GetTempPath()) "openfit-certs-$PID")
try {
    # 1. Certificate authority (only if there isn't one yet).
    if (-not (Test-Path $caKey) -or -not (Test-Path $caCrt)) {
        @"
[req]
distinguished_name = dn
prompt = no
x509_extensions = v3_ca
[dn]
CN = OpenFit Local CA ($env:COMPUTERNAME)
O = OpenFit (self-hosted)
[v3_ca]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
"@ | Set-Content -Encoding ascii "$tmp\ca.cnf"
        & $openssl req -x509 -new -newkey rsa:3072 -nodes -sha256 -days 3650 -keyout $caKey -out $caCrt -config "$tmp\ca.cnf" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Creating the certificate authority failed." }
        Write-Host "Created certificate authority: certs\rootCA.pem (install this on the iPhone)"
    } else {
        Write-Host "Reusing existing certificate authority: certs\rootCA.pem"
    }

    # 2. Server certificate for this PC's addresses. iOS requires SAN entries, the
    #    serverAuth usage, and at most 825 days of validity.
    $host_ = $env:COMPUTERNAME.ToLower()
    $san = @("DNS:localhost", "DNS:$host_.local", "IP:127.0.0.1") + ($tsNames | ForEach-Object { "DNS:$_" }) + ($Ip | ForEach-Object { "IP:$_" })
    @"
[req]
distinguished_name = dn
prompt = no
[dn]
CN = OpenFit ($($Ip[0]))
[v3_srv]
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = $($san -join ', ')
authorityKeyIdentifier = keyid
subjectKeyIdentifier = hash
"@ | Set-Content -Encoding ascii "$tmp\srv.cnf"
    & $openssl req -new -newkey rsa:2048 -nodes -keyout "$certs\key.pem" -out "$tmp\srv.csr" -config "$tmp\srv.cnf" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Creating the server key failed." }
    & $openssl x509 -req -in "$tmp\srv.csr" -CA $caCrt -CAkey $caKey -CAcreateserial -CAserial "$tmp\ca.srl" `
        -out "$certs\cert.pem" -days 800 -sha256 -extfile "$tmp\srv.cnf" -extensions v3_srv 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Signing the server certificate failed." }
    Write-Host "Created server certificate for: $($san -join ', ')"
    Write-Host ""
    Write-Host "Keep certs\rootCA-key.pem private. Never copy it off this PC." -ForegroundColor Yellow
} finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
