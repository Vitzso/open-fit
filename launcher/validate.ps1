# Checks that OpenFit's files and installed parts are consistent, and repairs what's out of step.
# Double-click Validate.cmd, or:
#   pwsh -File launcher\validate.ps1              # check and fix
#   pwsh -File launcher\validate.ps1 -CheckOnly   # only report, change nothing
#
# What it checks (and fixes):
#   project files      missing tracked files            -> restored from git
#   Windows scripts    LF line endings, BOM problems    -> CRLF; BOM added (.ps1 with non-ASCII) or removed (.cmd)
#   .env               missing, BOM, missing/duplicate keys, empty model -> created / cleaned up
#   Node.js            missing or older than OpenFit needs               -> installed / updated
#   npm packages       missing packages, lock file changed               -> npm install
#   database client    missing or made from an older schema              -> prisma generate
#   database           migrations not applied                            -> prisma migrate deploy
#   app build          missing or older than the source                  -> npm run build
#   HTTPS certificates key/cert mismatch, expired, wrong CA, new address -> re-issued
#   shortcuts          pointing at another folder                        -> recreated
# Exit code 0 when everything is fine (or was fixed), 1 when a problem remains.
param([switch]$CheckOnly)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$Host.UI.RawUI.WindowTitle = "OpenFit check"

$Results = New-Object System.Collections.Generic.List[object]
$StatusColor = @{ OK = "Green"; FIXED = "Green"; WARN = "Yellow"; SKIPPED = "DarkGray"; PROBLEM = "Red"; FAILED = "Red" }

# Records and prints one result line.
function Report($status, $label, $detail = "") {
    $Results.Add([pscustomobject]@{ Status = $status; Label = $label; Detail = $detail })
    $line = "  {0,-8} {1}" -f $status, $label
    if ($detail) { $line += ": $detail" }
    Write-Host $line -ForegroundColor $StatusColor[$status]
}

Write-Host ""
Write-Host "  OpenFit check$(if ($CheckOnly) { ' (report only)' })" -ForegroundColor Green
Write-Host ""

# 1. Project files. Checked before loading the setup helpers, which are among them.
$RequiredFiles = @(
    "package.json", "package-lock.json", "next.config.mjs", "postcss.config.mjs", "tsconfig.json", "server.mjs",
    "prisma.config.ts", "prisma\schema.prisma", "prisma\seed.mjs", ".env.example", "src\middleware.ts",
    "OpenFit.cmd", "Setup.cmd", "launcher\launch.ps1", "launcher\setup.ps1", "launcher\make-certs.ps1",
    "launcher\create-shortcut.ps1", "launcher\openfit.ico",
    "launcher\setup\common.ps1", "launcher\setup\node.ps1", "launcher\setup\git.ps1", "launcher\setup\env.ps1",
    "launcher\setup\app.ps1", "launcher\setup\ollama.ps1", "launcher\setup\remote.ps1",
    "launcher\setup\certs.ps1", "launcher\setup\shortcut.ps1"
)
$missingFiles = @($RequiredFiles | Where-Object { -not (Test-Path (Join-Path $Root $_)) })
if ($missingFiles.Count -eq 0) {
    Report OK "Project files"
} elseif ($CheckOnly) {
    Report PROBLEM "Project files" "missing $($missingFiles -join ', ')"
} else {
    $git = Get-Command git -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($git -and (Test-Path (Join-Path $Root ".git"))) {
        Write-Host "  Restoring $($missingFiles -join ', ') from git..." -ForegroundColor Yellow
        $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
        & $git.Source checkout HEAD -- ($missingFiles | ForEach-Object { $_ -replace '\\', '/' }) 2>&1 | Out-Null
        $ErrorActionPreference = $prev
    }
    $stillMissing = @($missingFiles | Where-Object { -not (Test-Path (Join-Path $Root $_)) })
    if ($stillMissing.Count -eq 0) { Report FIXED "Project files" "restored $($missingFiles -join ', ')" }
    else { Report FAILED "Project files" "can't restore $($stillMissing -join ', '); download OpenFit again" }
}
$helpers = "common", "node", "git", "env", "app", "remote", "certs", "ollama"
if (@($helpers | Where-Object { -not (Test-Path (Join-Path $PSScriptRoot "setup\$_.ps1")) }).Count -gt 0) {
    Write-Host ""
    Write-Host "  The setup scripts themselves are missing, so nothing else can be checked." -ForegroundColor Red
    exit 1
}
foreach ($part in $helpers) { . (Join-Path $PSScriptRoot "setup\$part.ps1") }

# Runs one check. $Test returns $null when all is well, or a description of the problem.
# $Fix repairs it and returns $true on success; the check then runs again to confirm.
# -Advisory: report a problem as a warning (nothing this script should change on its own).
function Invoke-Check($Label, [scriptblock]$Test, [scriptblock]$Fix, [switch]$Advisory) {
    $found = & $Test
    if (-not $found) { Report OK $Label; return }
    if ($Advisory -or -not $Fix) { Report $(if ($Advisory) { "WARN" } else { "PROBLEM" }) $Label $found; return }
    if ($CheckOnly) { Report PROBLEM $Label $found; return }
    Say "${Label}: $found. Fixing..." Yellow
    $repaired = $false
    try { $repaired = [bool](& $Fix | Select-Object -Last 1) } catch { Say $_.Exception.Message Red }
    $remaining = if ($repaired) { & $Test } else { $found }
    if ($repaired -and -not $remaining) { Report FIXED $Label $found } else { Report FAILED $Label $remaining }
}

# 2. Windows scripts: CRLF line endings (as .gitattributes asks; cmd.exe needs them for labels and
#    multi-line blocks), a BOM on .ps1 files with non-ASCII text (Windows PowerShell 5.1 misreads
#    them otherwise) and no BOM on .cmd files (cmd.exe would try to run the BOM as a command).
$ScriptFiles = @(Get-ChildItem $Root -File -Filter *.cmd) + @(Get-ChildItem (Join-Path $Root "launcher") -File -Recurse -Filter *.ps1)

function Get-ScriptFileProblem($file) {
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $hasBom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
    $text = $Utf8NoBom.GetString($bytes, $(if ($hasBom) { 3 } else { 0 }), $bytes.Length - $(if ($hasBom) { 3 } else { 0 }))
    $issues = @()
    if ($text -match '(?<!\r)\n') { $issues += "LF line endings" }
    if ($file.Extension -eq ".cmd" -and $hasBom) { $issues += "byte-order mark" }
    if ($file.Extension -eq ".ps1" -and -not $hasBom -and $text -match '[^\x00-\x7F]') { $issues += "non-ASCII text without a byte-order mark" }
    return $issues
}

function Repair-ScriptFile($file) {
    $bytes = [IO.File]::ReadAllBytes($file.FullName)
    $hasBom = $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
    $text = $Utf8NoBom.GetString($bytes, $(if ($hasBom) { 3 } else { 0 }), $bytes.Length - $(if ($hasBom) { 3 } else { 0 }))
    $text = $text -replace '\r?\n', "`r`n"
    $wantBom = $file.Extension -eq ".ps1" -and $text -match '[^\x00-\x7F]'
    [IO.File]::WriteAllText($file.FullName, $text, (New-Object System.Text.UTF8Encoding $wantBom))
}

Invoke-Check "Windows scripts" -Test {
    $bad = @($ScriptFiles | Where-Object { (Get-ScriptFileProblem $_).Count -gt 0 } |
        ForEach-Object { "$($_.Name) ($((Get-ScriptFileProblem $_) -join ', '))" })
    if ($bad.Count -gt 0) { $bad -join "; " }
} -Fix {
    $ScriptFiles | Where-Object { (Get-ScriptFileProblem $_).Count -gt 0 } | ForEach-Object { Repair-ScriptFile $_ }
    $true
}

# 3. .env settings file.
$EnvFile = Join-Path $Root ".env"
$EnvExample = Join-Path $Root ".env.example"
$KeyPattern = '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*='

# KEY -> the template's line for it, in template order.
function Get-ExampleLines {
    $map = [ordered]@{}
    foreach ($l in [IO.File]::ReadAllLines($EnvExample, $Utf8NoBom)) {
        if ($l -match $KeyPattern -and -not $map.Contains($Matches[1])) { $map[$Matches[1]] = $l }
    }
    return $map
}

function Get-EnvProblem {
    if (-not (Test-Path $EnvFile)) { return "missing" }
    $issues = @()
    $bytes = [IO.File]::ReadAllBytes($EnvFile)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $issues += "starts with a byte-order mark (hides the first setting)"
    }
    $keys = @([IO.File]::ReadAllLines($EnvFile, $Utf8NoBom) | Where-Object { $_ -match $KeyPattern } | ForEach-Object { $Matches[1] })
    $dupes = @($keys | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
    if ($dupes.Count -gt 0) { $issues += "duplicate $($dupes -join ', ')" }
    $absent = @((Get-ExampleLines).Keys | Where-Object { $keys -notcontains $_ })
    if ($absent.Count -gt 0) { $issues += "missing $($absent -join ', ')" }
    if ($keys -contains "OLLAMA_MODEL" -and -not (Get-EnvValue $EnvFile "OLLAMA_MODEL")) { $issues += "OLLAMA_MODEL is empty" }
    if ($keys -contains "DATABASE_URL" -and -not (Get-EnvValue $EnvFile "DATABASE_URL")) { $issues += "DATABASE_URL is empty" }
    if ($issues.Count -gt 0) { return $issues -join "; " }
}

function Repair-Env {
    $example = Get-ExampleLines
    if (-not (Test-Path $EnvFile)) {
        Copy-Item $EnvExample $EnvFile
        Set-EnvValue $EnvFile "OLLAMA_MODEL" $RecommendedModel
        return $true
    }
    # Reading with ReadAllLines drops a BOM; writing back with $Utf8NoBom keeps it off.
    $lines = @([IO.File]::ReadAllLines($EnvFile, $Utf8NoBom))
    # Duplicates: Next.js and Prisma use the LAST value, so keep that one.
    $lastIndex = @{}
    for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match $KeyPattern) { $lastIndex[$Matches[1]] = $i } }
    $kept = for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $KeyPattern -and $lastIndex[$Matches[1]] -ne $i) { continue }
        $lines[$i]
    }
    $kept = @($kept)
    foreach ($k in $example.Keys) {
        if (-not $lastIndex.ContainsKey($k)) { $kept += $example[$k] }
    }
    [IO.File]::WriteAllLines($EnvFile, [string[]]$kept, $Utf8NoBom)
    if (-not (Get-EnvValue $EnvFile "OLLAMA_MODEL")) { Set-EnvValue $EnvFile "OLLAMA_MODEL" $RecommendedModel }
    if (-not (Get-EnvValue $EnvFile "DATABASE_URL")) { Set-EnvValue $EnvFile "DATABASE_URL" (Get-EnvValue $EnvExample "DATABASE_URL") }
    return $true
}

Invoke-Check ".env settings" -Test { Get-EnvProblem } -Fix { Repair-Env }
Invoke-Check "Passcode" -Advisory -Test {
    if ((Test-Path $EnvFile) -and -not (Get-EnvValue $EnvFile "APP_PASSCODE")) {
        "APP_PASSCODE is empty, so anyone on your Wi-Fi can open OpenFit (run Setup to choose one)"
    }
}

# 4. Node.js and the app's own files (these need Node.js).
Invoke-Check "Node.js" -Test {
    $v = Get-NodeVersion
    if (-not $v) { "not installed" } elseif ($v -lt $MinNodeVersion) { "version $v is older than $MinNodeVersion" }
} -Fix { Install-Node }

if (Test-NodeReady) {
    Invoke-Check "npm packages" -Test {
        if (-not (Test-Path (Join-Path $Root "node_modules"))) { return "not installed" }
        $absent = Get-MissingPackages $Root
        if ($absent.Count -gt 0) { return "missing $($absent -join ', ')" }
        if (Test-InstallNeeded $Root) { return "package.json or package-lock.json changed since the last install" }
    } -Fix { Invoke-Quiet "Installing packages" { npm install --no-fund --no-audit } }

    if (Test-Path (Join-Path $Root "node_modules\prisma")) {
        Invoke-Check "Database client" -Test {
            if (Test-PrismaClientStale $Root) { "missing or made from an older prisma\schema.prisma" }
        } -Fix { Invoke-Quiet "Preparing the database client" { npx prisma generate } }

        Invoke-Check "Database migrations" -Test {
            $r = Invoke-Native { npx prisma migrate status }
            if ($r.ExitCode -ne 0) {
                $why = ($r.Output | Where-Object { $_ -match 'not yet been applied|does not exist|failed|drift' } | Select-Object -First 1)
                if ($why) { "$why".Trim() } else { "not up to date" }
            }
        } -Fix { Invoke-Quiet "Database setup" { npx prisma migrate deploy } }

        Invoke-Check "App build" -Test {
            if (-not (Test-Path (Join-Path $Root ".next\BUILD_ID"))) { "not built yet" }
            elseif (Test-BuildNeeded $Root) { "the source changed after the last build" }
        } -Fix { Invoke-Quiet "Build" { npm run build } }
    } else {
        Report SKIPPED "Database and build" "needs the npm packages first"
    }
} else {
    Report SKIPPED "npm packages, database and build" "needs Node.js $MinNodeVersion or newer"
}

# 5. HTTPS certificates.
$CertFiles = "key.pem", "cert.pem", "rootCA.pem", "rootCA-key.pem" | ForEach-Object { Join-Path $Root "certs\$_" }
if (-not (Find-OpenSsl)) {
    if (@($CertFiles | Where-Object { Test-Path $_ }).Count -gt 0) {
        Report WARN "HTTPS certificates" "OpenSSL isn't installed, so they can't be checked (run Setup)"
    } else {
        Report WARN "HTTPS certificates" "none yet, and no OpenSSL to make them (run Setup); the app uses plain HTTP"
    }
} else {
    Invoke-Check "HTTPS certificates" -Test {
        $p = Get-CertProblem $Root
        if ($p -eq "missing") { "none yet (the iPhone camera needs HTTPS)" }
        elseif ($p -eq "ca") { "the certificate authority files are incomplete" }
        else { $p }
    } -Fix {
        $newCa = (Get-CertProblem $Root) -eq "ca"
        $ok = if ($newCa) { Invoke-MakeCerts $Root -NewAuthority } else { Invoke-MakeCerts $Root }
        if ($ok -and $newCa) { Say "On the iPhone, open /ca.crt again and trust the new certificate." Yellow }
        $ok
    }
}

# Remote access (optional): the chosen private network is installed and connected.
Invoke-Check "Remote access" -Advisory -Test {
    $rc = Get-RemoteConfig $Root
    if ($rc.Provider -eq "none") { return }
    if ($rc.Provider -eq "custom" -and -not $rc.Address) { return "Other is chosen but REMOTE_ADDRESS is empty (set it in Settings -> Remote access)" }
    $rs = Get-RemoteStatus $rc
    if (-not $rs.Installed) { return "$($rc.Label) isn't installed on this PC (run Setup)" }
    if (-not $rs.Connected) { return "$($rc.Label) isn't connected, so OpenFit only works on home Wi-Fi right now" }
}

# 6. Shortcuts: they hold absolute paths, so they break when the folder moves.
$Launcher = Join-Path $PSScriptRoot "launch.ps1"
$ProjectLink = Join-Path $Root "OpenFit.lnk"
$DesktopLink = Join-Path ([Environment]::GetFolderPath("Desktop")) "OpenFit.lnk"

# The launch.ps1 a shortcut runs, or "" if it can't be read.
function Get-ShortcutLauncher($path) {
    $lnk = (New-Object -ComObject WScript.Shell).CreateShortcut($path)
    if (-not (Test-Path $lnk.TargetPath)) { return "" }
    if ($lnk.Arguments -match '-File\s+"([^"]+)"') { return $Matches[1] }
    return ""
}

# Shortcuts that no longer work: their program or launch.ps1 is gone (e.g. the folder was moved).
# A Desktop shortcut that runs another OpenFit folder that still exists is left alone: that
# may well be the copy you use.
function Get-BrokenShortcuts {
    @($ProjectLink, $DesktopLink | Where-Object { Test-Path $_ } | Where-Object {
        $target = Get-ShortcutLauncher $_
        -not $target -or -not (Test-Path $target) -or ($_ -eq $ProjectLink -and $target -ne $Launcher)
    })
}

Invoke-Check "Shortcuts" -Test {
    $broken = @(Get-BrokenShortcuts)
    if ($broken.Count -gt 0) { "$($broken -join ', ') no longer work" }
    elseif (-not (Test-Path $ProjectLink)) { "OpenFit.lnk is missing from the project folder" }
} -Fix {
    $desktopBroken = @(Get-BrokenShortcuts) -contains $DesktopLink
    if ($desktopBroken) { & (Join-Path $PSScriptRoot "create-shortcut.ps1") -Desktop | Out-Null }
    else { & (Join-Path $PSScriptRoot "create-shortcut.ps1") | Out-Null }
    $true
}
if ((Test-Path $DesktopLink) -and ($other = Get-ShortcutLauncher $DesktopLink) -and (Test-Path $other) -and $other -ne $Launcher) {
    Report WARN "Desktop shortcut" "starts the OpenFit in $(Split-Path (Split-Path $other)), not this folder (left as is)"
}

# Summary.
$counts = $Results | Group-Object Status | ForEach-Object { "$($_.Count) $($_.Name.ToLower())" }
$bad = @($Results | Where-Object { $_.Status -in "PROBLEM", "FAILED" })
Write-Host ""
Write-Host "  $($counts -join ', ')" -ForegroundColor $(if ($bad.Count -gt 0) { "Red" } else { "Green" })
if ($bad.Count -gt 0 -and $CheckOnly) { Say "Run without -CheckOnly (or double-click Validate.cmd) to fix these." Yellow }
Write-Host ""
exit $(if ($bad.Count -gt 0) { 1 } else { 0 })
