# Step (optional): remote access, for using OpenFit away from home over a private network.
# Pick one in .env (REMOTE_ACCESS) or let Setup ask:
#   tailscale   Tailscale (also Headscale, its open-source server: set REMOTE_LOGIN_SERVER)
#   wireguard   WireGuard for Windows, with a tunnel you configure yourself
#   zerotier    ZeroTier One
#   netbird     NetBird (open source; self-hosted: set REMOTE_LOGIN_SERVER to your management URL)
#   custom      anything else (OpenVPN, Nebula, a router VPN, a port forward...): set REMOTE_ADDRESS
#   none        home Wi-Fi only
# Optional, for any of them:
#   REMOTE_ADDRESS     the address the phone uses when away (IP or name); added to the HTTPS certificate
#   REMOTE_INTERFACE   the network adapter to read this PC's address from (name or part of it)
# Get-RemoteAddresses is shared with certs.ps1, make-certs.ps1, launch.ps1 and validate.ps1.

$RemoteProviders = [ordered]@{
    tailscale = @{ Label = "Tailscale"; Package = "Tailscale.Tailscale"; Exe = "C:\Program Files\Tailscale\tailscale.exe"; Adapter = "Tailscale"
        Hint = "Install Tailscale on the iPhone and sign in with the same account." }
    wireguard = @{ Label = "WireGuard"; Package = "WireGuard.WireGuard"; Exe = "C:\Program Files\WireGuard\wireguard.exe"; Adapter = "WireGuard Tunnel"
        Hint = "In the WireGuard app, import or create a tunnel and activate it; add the matching peer in the WireGuard app on the iPhone." }
    zerotier  = @{ Label = "ZeroTier"; Package = "ZeroTier.ZeroTierOne"; Exe = "C:\ProgramData\ZeroTier\One\zerotier-one_x64.exe"; Adapter = "ZeroTier Virtual Port"
        Hint = "Join your network from the ZeroTier tray icon, authorize this PC in ZeroTier Central (or your own controller), and join the same network on the iPhone." }
    netbird   = @{ Label = "NetBird"; Package = "Netbird.Netbird"; Exe = "C:\Program Files\NetBird\netbird.exe"; Adapter = "wt0|NetBird"
        Hint = "Sign in from the NetBird tray icon, and install NetBird on the iPhone with the same account." }
    custom    = @{ Label = "Other (your own address)"; Package = $null; Exe = $null; Adapter = $null
        Hint = "Set REMOTE_ADDRESS in .env to the address the phone uses when away (for example your OpenVPN or Nebula IP, or a DNS name)." }
    none      = @{ Label = "None (home Wi-Fi only)"; Package = $null; Exe = $null; Adapter = $null; Hint = "" }
}

# The remote-access settings from .env. An unset REMOTE_ACCESS means Tailscale, as before this option existed.
function Get-RemoteConfig($root) {
    $envFile = Join-Path $root ".env"
    $provider = (Get-EnvValue $envFile "REMOTE_ACCESS").Trim().ToLower()
    # Only a valid choice counts as made; anything else falls back to Tailscale and Setup asks again.
    $explicit = $RemoteProviders.Contains($provider)
    if (-not $explicit) { $provider = "tailscale" }
    return [pscustomobject]@{
        Provider    = $provider
        Explicit    = $explicit
        Label       = $RemoteProviders[$provider].Label
        Address     = (Get-EnvValue $envFile "REMOTE_ADDRESS").Trim()
        Interface   = (Get-EnvValue $envFile "REMOTE_INTERFACE").Trim()
        LoginServer = (Get-EnvValue $envFile "REMOTE_LOGIN_SERVER").Trim()
    }
}

# IPv4 addresses of the Up adapters whose name or description matches `$pattern` (a regex).
function Get-AdapterAddresses($pattern) {
    if (-not $pattern) { return @() }
    $adapters = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object {
            $_.Status -eq "Up" -and ($_.Name -match $pattern -or $_.InterfaceDescription -match $pattern) })
    return @($adapters | ForEach-Object {
            Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                Where-Object { $_.IPAddress -notmatch '^169\.254\.' } | ForEach-Object { $_.IPAddress } })
}

# Runs a provider's command-line tool and parses its JSON output; $null when it isn't there or fails.
function Get-CliJson($exe, [string[]]$arguments) {
    if (-not $exe -or -not (Test-Path $exe)) { return $null }
    try { return (& $exe @arguments 2>$null | Out-String | ConvertFrom-Json) } catch { return $null }
}

# Whether the provider's app is installed, connected, and this PC's addresses on that network.
function Get-RemoteStatus($cfg) {
    $p = $RemoteProviders[$cfg.Provider]
    $status = [pscustomobject]@{ Installed = $false; Connected = $false; Ips = @(); Names = @() }
    switch ($cfg.Provider) {
        "none" { return $status }
        "tailscale" {
            $status.Installed = Test-Path $p.Exe
            $ts = Get-CliJson $p.Exe @("status", "--json")
            if ($ts -and $ts.BackendState -eq "Running") {
                $status.Connected = $true
                $status.Ips = @($ts.Self.TailscaleIPs | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' })
                if ($ts.Self.DNSName) { $status.Names = @($ts.Self.DNSName.TrimEnd(".")) }
            }
        }
        "netbird" {
            $status.Installed = Test-Path $p.Exe
            $nb = Get-CliJson $p.Exe @("status", "--json")
            if ($nb -and $nb.management.connected) {
                $status.Connected = $true
                if ($nb.netbirdIp) { $status.Ips = @(($nb.netbirdIp -split "/")[0]) }
                if ($nb.fqdn) { $status.Names = @($nb.fqdn.TrimEnd(".")) }
            }
        }
        default {
            # WireGuard, ZeroTier and custom: read the tunnel adapter's address.
            $status.Installed = if ($p.Exe) { Test-Path $p.Exe } else { $true }
            $pattern = if ($cfg.Interface) { [regex]::Escape($cfg.Interface) } else { $p.Adapter }
            $status.Ips = @(Get-AdapterAddresses $pattern)
            $status.Connected = $status.Ips.Count -gt 0 -or ($cfg.Provider -eq "custom" -and [bool]$cfg.Address)
        }
    }
    if ($cfg.Interface -and $cfg.Provider -in "tailscale", "netbird") {
        $status.Ips = @($status.Ips + (Get-AdapterAddresses ([regex]::Escape($cfg.Interface))) | Select-Object -Unique)
    }
    return $status
}

# This PC's addresses on the remote network, for the certificate and the launcher:
# @{ Ips = @(...); Names = @(...) }, including REMOTE_ADDRESS. Empty when remote access is off.
function Get-RemoteAddresses($root) {
    $cfg = Get-RemoteConfig $root
    if ($cfg.Provider -eq "none") { return [pscustomobject]@{ Ips = @(); Names = @() } }
    $st = Get-RemoteStatus $cfg
    $ips = @($st.Ips); $names = @($st.Names)
    if ($cfg.Address) {
        if ($cfg.Address -match '^\d+\.\d+\.\d+\.\d+$') { $ips += $cfg.Address } else { $names += $cfg.Address }
    }
    return [pscustomobject]@{ Ips = @($ips | Select-Object -Unique); Names = @($names | Select-Object -Unique) }
}

# Asks which remote access to use (first run, or when REMOTE_ACCESS isn't set) and saves it to .env.
function Select-RemoteProvider($root) {
    $keys = @($RemoteProviders.Keys)
    $tsInstalled = Test-Path $RemoteProviders.tailscale.Exe
    Say "To use OpenFit away from home, the PC and the iPhone join a private network. Which one?"
    for ($i = 0; $i -lt $keys.Count; $i++) { Say "  $($i + 1). $($RemoteProviders[$keys[$i]].Label)" }
    $default = if ($tsInstalled) { 1 } else { $keys.Count }
    $answer = Read-Host "  Choose 1-$($keys.Count) [$default]"
    $n = 0
    if (-not [int]::TryParse("$answer".Trim(), [ref]$n) -or $n -lt 1 -or $n -gt $keys.Count) { $n = $default }
    $choice = $keys[$n - 1]
    Set-EnvValue (Join-Path $root ".env") "REMOTE_ACCESS" $choice
    if ($choice -eq "custom" -and -not (Get-EnvValue (Join-Path $root ".env") "REMOTE_ADDRESS")) {
        $addr = (Read-Host "  The address your phone uses when away (IP or name, Enter to skip)").Trim()
        if ($addr -match '^[A-Za-z0-9.\-]+$') { Set-EnvValue (Join-Path $root ".env") "REMOTE_ADDRESS" $addr }
        elseif ($addr) { Say "That doesn't look like an IP address or host name; set REMOTE_ADDRESS in .env later." Yellow }
    }
    return $choice
}

# Installs the chosen remote access if needed and checks it's connected. Returns $true when the phone can reach the PC from anywhere.
function Install-RemoteAccess($root) {
    $cfg = Get-RemoteConfig $root
    if (-not $cfg.Explicit) {
        Select-RemoteProvider $root | Out-Null
        $cfg = Get-RemoteConfig $root
    }
    $p = $RemoteProviders[$cfg.Provider]
    if ($cfg.Provider -eq "none") { Say "Skipped. OpenFit works on your home Wi-Fi. (Change it later with REMOTE_ACCESS in .env or in Settings.)" Gray; return $false }

    $st = Get-RemoteStatus $cfg
    if ($p.Package -and -not $st.Installed) {
        Install-Package $p.Package $p.Label | Out-Null
        $st = Get-RemoteStatus $cfg
        if (-not $st.Installed) { Say "$($p.Label) wasn't installed. Get it from its website, then run Setup again." Yellow; return $false }
    } elseif ($p.Package) {
        Say "$($p.Label) is installed." Green
    }

    if ($st.Connected) {
        $where = @($st.Names + $st.Ips + @($cfg.Address) | Where-Object { $_ } | Select-Object -Unique) -join ", "
        Say "$($p.Label) is connected$(if ($where) { " ($where)" })." Green
        return $true
    }

    # Not connected yet: open the app and say what to do.
    if ($cfg.Provider -eq "tailscale") {
        $ipn = Join-Path (Split-Path $p.Exe) "tailscale-ipn.exe"
        if ($cfg.LoginServer) { Say "Self-hosted (Headscale): sign in with  tailscale up --login-server $($cfg.LoginServer)" Yellow }
        elseif (Test-Path $ipn) { Start-Process $ipn }
    } elseif ($cfg.Provider -eq "netbird" -and $cfg.LoginServer) {
        Say "Self-hosted: sign in with  netbird up --management-url $($cfg.LoginServer)" Yellow
    } elseif ($p.Exe -and (Test-Path $p.Exe) -and $cfg.Provider -eq "wireguard") {
        Start-Process $p.Exe
    }
    Say "$($p.Label) isn't connected yet. $($p.Hint)" Yellow
    return $false
}
