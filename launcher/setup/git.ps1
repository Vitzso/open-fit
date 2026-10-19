# Step: OpenSSL, which the HTTPS certificate script needs. It ships with Git for Windows.
# Find-OpenSsl and Invoke-OpenSsl are shared with make-certs.ps1, certs.ps1 and validate.ps1.

# Path to openssl.exe (on PATH or inside Git), or $null.
function Find-OpenSsl {
    $cmd = Get-Command openssl -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { return $cmd.Source }
    $git = Get-Command git -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($git) {
        # ...\Git\cmd\git.exe -> ...\Git\usr\bin\openssl.exe
        $candidate = Join-Path (Split-Path (Split-Path $git.Source)) "usr\bin\openssl.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    foreach ($base in $env:ProgramFiles, ${env:ProgramFiles(x86)}, (Join-Path "$env:LOCALAPPDATA" "Programs")) {
        if (-not $base) { continue }
        $candidate = Join-Path $base "Git\usr\bin\openssl.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

# Runs openssl with the given arguments. Returns its exit code and output; never throws on the
# progress dots openssl prints to stderr (which aborted Windows PowerShell 5.1 before).
function Invoke-OpenSsl($openssl, [string[]]$arguments) {
    return Invoke-Native { & $openssl @arguments }
}

# Installs Git for Windows if OpenSSL can't be found. Returns $true when OpenSSL is available.
function Install-OpenSsl {
    $found = Find-OpenSsl
    if (-not $found) { Update-SessionPath; $found = Find-OpenSsl }
    if ($found) { Say "OpenSSL is available." Green; return $true }
    Install-Package "Git.Git" "Git for Windows (provides OpenSSL)" | Out-Null
    if (Find-OpenSsl) { Say "OpenSSL is available." Green; return $true }
    Say "OpenSSL wasn't found; HTTPS certificates will be skipped." Yellow
    return $false
}
