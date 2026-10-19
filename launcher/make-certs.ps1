# Creates HTTPS certificates so the iPhone can use the live camera and install the app.
#   pwsh -File launcher\make-certs.ps1                 # uses this PC's LAN IP(s)
#   pwsh -File launcher\make-certs.ps1 -Ip 192.168.1.50
#   pwsh -File launcher\make-certs.ps1 -NewAuthority   # also replace the certificate authority
#
# Makes a private certificate authority (certs\rootCA.pem, installed once on the iPhone)
# and a server certificate signed by it (certs\cert.pem + key.pem, used by the launcher).
# Re-running keeps the existing authority, so after an IP change you don't need to
# reinstall anything on the phone. Uses the OpenSSL that ships with Git for Windows.
# Nothing is added to Windows' own trust store.
#
# Everything is generated in a temporary folder first and only copied into certs\ once it all
# succeeded, so a failure never leaves a key that doesn't match its certificate.
param([string[]]$Ip, [switch]$NewAuthority)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$certs = Join-Path $Root "certs"
New-Item -ItemType Directory -Force $certs | Out-Null

. (Join-Path $PSScriptRoot "setup\common.ps1")
. (Join-Path $PSScriptRoot "setup\git.ps1")

$openssl = Find-OpenSsl
if (-not $openssl) { throw "OpenSSL not found. Install Git for Windows (it includes OpenSSL)." }

# Runs openssl; throws with its output if it fails.
function Invoke-Checked($what, [string[]]$arguments) {
    $r = Invoke-OpenSsl $openssl $arguments
    if ($r.ExitCode -ne 0) {
        $detail = ($r.Output | Where-Object { "$_".Trim() } | Select-Object -Last 5) -join " / "
        throw "$what failed: $detail"
    }
}

if (-not $Ip) {
    $Ip = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq "Up" } |
        ForEach-Object { $_.IPv4Address.IPAddress } | Where-Object { $_ -notmatch '^(127\.|169\.254\.)' }
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
foreach ($h in ((Get-EnvValue (Join-Path $Root ".env") "ALLOWED_HOSTS") -split ',')) {
    $h = $h.Trim()
    if (-not $h) { continue }
    if ($h -match '^\d+\.\d+\.\d+\.\d+$') { $Ip += $h } else { $tsNames += $h }
}
$Ip = @($Ip | Select-Object -Unique)
$tsNames = @($tsNames | Select-Object -Unique)

$caKey = Join-Path $certs "rootCA-key.pem"
$caCrt = Join-Path $certs "rootCA.pem"
$tmp = New-Item -ItemType Directory -Force (Join-Path ([IO.Path]::GetTempPath()) "openfit-certs-$PID")
try {
    # 1. Certificate authority (only if there isn't a complete one yet, or -NewAuthority).
    $makeCa = $NewAuthority -or -not (Test-Path $caKey) -or -not (Test-Path $caCrt)
    if (-not $makeCa -and (Invoke-OpenSsl $openssl @("x509", "-in", $caCrt, "-noout", "-checkend", "0")).ExitCode -ne 0) {
        Write-Host "The certificate authority has expired; making a new one." -ForegroundColor Yellow
        $makeCa = $true
    }
    if ($makeCa) {
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
        Invoke-Checked "Creating the certificate authority" @(
            "req", "-x509", "-new", "-newkey", "rsa:3072", "-nodes", "-sha256", "-days", "3650",
            "-keyout", "$tmp\rootCA-key.pem", "-out", "$tmp\rootCA.pem", "-config", "$tmp\ca.cnf")
        $signCa = "$tmp\rootCA.pem"; $signKey = "$tmp\rootCA-key.pem"
    } else {
        Write-Host "Reusing existing certificate authority: certs\rootCA.pem"
        $signCa = $caCrt; $signKey = $caKey
    }

    # 2. Server certificate for this PC's addresses. iOS requires SAN entries, the
    #    serverAuth usage, and at most 825 days of validity.
    $host_ = $env:COMPUTERNAME.ToLower()
    $san = @("DNS:localhost", "DNS:$host_.local", "IP:127.0.0.1") + ($tsNames | ForEach-Object { "DNS:$_" }) + ($Ip | ForEach-Object { "IP:$_" })
    $san = @($san | Select-Object -Unique)
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
    Invoke-Checked "Creating the server key" @(
        "req", "-new", "-newkey", "rsa:2048", "-nodes", "-keyout", "$tmp\key.pem", "-out", "$tmp\srv.csr", "-config", "$tmp\srv.cnf")
    Invoke-Checked "Signing the server certificate" @(
        "x509", "-req", "-in", "$tmp\srv.csr", "-CA", $signCa, "-CAkey", $signKey, "-CAcreateserial", "-CAserial", "$tmp\ca.srl",
        "-out", "$tmp\cert.pem", "-days", "800", "-sha256", "-extfile", "$tmp\srv.cnf", "-extensions", "v3_srv")
    Invoke-Checked "Checking the new certificate" @("verify", "-CAfile", $signCa, "$tmp\cert.pem")

    # 3. Everything worked: put the files in place.
    if ($makeCa) {
        Copy-Item "$tmp\rootCA-key.pem" $caKey -Force
        Copy-Item "$tmp\rootCA.pem" $caCrt -Force
        Write-Host "Created certificate authority: certs\rootCA.pem (install this on the iPhone)"
    }
    Copy-Item "$tmp\key.pem" (Join-Path $certs "key.pem") -Force
    Copy-Item "$tmp\cert.pem" (Join-Path $certs "cert.pem") -Force
    Write-Host "Created server certificate for: $($san -join ', ')"
    Write-Host ""
    Write-Host "Keep certs\rootCA-key.pem private. Never copy it off this PC." -ForegroundColor Yellow
} finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
