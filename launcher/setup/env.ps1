# Step: the .env settings file (passcode and AI model).

$RecommendedModel = "gemma4:latest"

# Asks for a passcode twice, without showing it. Returns "" if the user skips.
function Read-Passcode {
    for ($i = 0; $i -lt 3; $i++) {
        $a = Read-Host "  Choose a passcode for OpenFit (Enter to skip)" -AsSecureString
        $plainA = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($a))
        if (-not $plainA) { return "" }
        if ($plainA.Length -lt 4) { Say "Use at least 4 characters." Yellow; continue }
        $b = Read-Host "  Type it again" -AsSecureString
        $plainB = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($b))
        if ($plainA -eq $plainB) { return $plainA }
        Say "They didn't match. Try again." Yellow
    }
    return ""
}

# Creates .env from the template if needed, then fills in the passcode and model when they're unset.
function Initialize-Env($root) {
    $envFile = Join-Path $root ".env"
    if (-not (Test-Path $envFile)) {
        Copy-Item (Join-Path $root ".env.example") $envFile
        Set-EnvValue $envFile "OLLAMA_MODEL" $RecommendedModel
        Say "Created .env (settings file)." Green
    }

    if (Get-EnvValue $envFile "APP_PASSCODE") {
        Say "Passcode is set." Green
    } else {
        Say "A passcode stops anyone else on your Wi-Fi from opening OpenFit." Yellow
        $code = Read-Passcode
        if ($code) { Set-EnvValue $envFile "APP_PASSCODE" $code; Say "Passcode saved." Green }
        else { Say "Skipped. You can add APP_PASSCODE to .env later." Yellow }
    }

    $model = Get-EnvValue $envFile "OLLAMA_MODEL"
    Say "AI coach model: $model" Green
    return $model
}
