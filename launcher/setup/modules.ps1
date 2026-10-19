# Step (optional): the Pro training module. Setup offers it to new installs, and the launcher
# offers it once to people who updated from a version without it. The answer is remembered in
# .env (PRO_TRAINING_OFFERED), so it's never asked twice; Settings, Modules can change it any time.
# Needs app.ps1 (Invoke-Quiet) and common.ps1 dot-sourced first.

$ProTrainingPitch = "Pro training adds an 870-exercise library with photos, personal-record alerts, a plate and warm-up calculator, warm-up and drop sets, supersets and your own programs."

# "on" / "off", or "" if it can't be read (packages or database not ready yet).
function Get-ModuleState($root, $id) {
    $r = Invoke-Native { node (Join-Path $root "scripts\module.mjs") status $id }
    if ($r.ExitCode -ne 0) { return "" }
    return ("$($r.Output | Select-Object -Last 1)").Trim()
}

# Turns a module on (and downloads its data). Returns $true on success.
function Enable-Module($root, $id) {
    $r = Invoke-Native { node (Join-Path $root "scripts\module.mjs") enable $id }
    $r.Output | Where-Object { "$_".Trim() } | ForEach-Object { Say "$_" }
    return $r.ExitCode -eq 0
}

# The Pro training answer, asked at the start of Setup so the rest runs unattended: $given (from the
# desktop app's checkbox) if set, "" when there's nothing to ask (it's on, or you answered before),
# otherwise the answer to the question. Install-ProTraining -Answer applies it once the app is installed.
function Read-ProTrainingAnswer($root, [string]$given) {
    if ($given -in "yes", "no") { return $given }
    if (Get-EnvValue (Join-Path $root ".env") "PRO_TRAINING_OFFERED") { return "" }
    if ((Test-Path (Join-Path $root "node_modules")) -and (Get-ModuleState $root "training-pro") -eq "on") { return "" }
    Say $ProTrainingPitch
    if (Ask-YesNo "Add Pro training?" $true) { return "yes" } else { return "no" }
}

# Asks whether to add Pro training, unless it's on already or you answered before.
# -Once: only ask if it was never offered (the launcher uses this for people who updated).
# -Answer yes|no: decided already (Read-ProTrainingAnswer or the desktop app), so don't ask.
function Install-ProTraining($root, [switch]$Once, [string]$Answer) {
    Push-Location $root
    try {
        $envFile = Join-Path $root ".env"
        $state = Get-ModuleState $root "training-pro"
        if ($state -eq "on") {
            if (-not $Once) { Say "Pro training is on." Green }
            if (-not (Get-EnvValue $envFile "PRO_TRAINING_OFFERED")) { Set-EnvValue $envFile "PRO_TRAINING_OFFERED" "yes" }
            return $true
        }
        if ($state -eq "") {
            if (-not $Once) { Say "Skipped: the app isn't installed yet. Switch Pro training on later in Settings, Modules." Yellow }
            return $false
        }
        $answered = Get-EnvValue $envFile "PRO_TRAINING_OFFERED"
        if ($Answer -in "yes", "no") {
            $yes = $Answer -eq "yes"
        } elseif ($answered -eq "yes" -and -not $Once) {
            $yes = $true # you said yes before but it's off (a new database, or it failed then): switch it on
        } elseif ($answered) {
            if (-not $Once) { Say "Pro training is off. Switch it on any time in Settings, Modules." Gray }
            return $false
        } else {
            if ($Once) { Write-Host ""; Say "New in this version: the Pro training module." Cyan }
            Say $ProTrainingPitch
            $yes = Ask-YesNo "Add Pro training?" $true
        }
        Set-EnvValue $envFile "PRO_TRAINING_OFFERED" ($(if ($yes) { "yes" } else { "no" }))
        if (-not $yes) { Say "Not added. You can switch it on any time in Settings, Modules." Gray; return $false }
        if (Enable-Module $root "training-pro") { Say "Pro training is on." Green; return $true }
        Say "Couldn't switch it on now; do it in Settings, Modules." Yellow
        return $false
    } finally { Pop-Location }
}
