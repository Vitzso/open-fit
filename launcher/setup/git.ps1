# Step: OpenSSL, which the HTTPS certificate script needs. It ships with Git for Windows.

# Path to openssl.exe (on PATH or inside Git), or $null.
function Find-OpenSsl {
    $cmd = Get-Command openssl -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) {
        $candidate = Join-Path (Split-Path (Split-Path $git.Source)) "usr\bin\openssl.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    $default = "C:\Program Files\Git\usr\bin\openssl.exe"
    if (Test-Path $default) { return $default }
    return $null
}

# Installs Git for Windows if OpenSSL can't be found. Returns $true when OpenSSL is available.
function Install-OpenSsl {
    if (Find-OpenSsl) { Say "OpenSSL is available." Green; return $true }
    Install-Package "Git.Git" "Git for Windows (provides OpenSSL)" | Out-Null
    if (Find-OpenSsl) { Say "OpenSSL is available." Green; return $true }
    Say "OpenSSL wasn't found; HTTPS certificates will be skipped." Yellow
    return $false
}
