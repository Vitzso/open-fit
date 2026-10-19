# Step: Ollama (runs the AI coach on this PC) and the coach's model.
# Start-Ollama is shared with launch.ps1.

$OllamaApi = "http://127.0.0.1:11434"

# Path of the Ollama tray app, or $null if it isn't installed.
function Find-OllamaApp {
    $app = Join-Path "$env:LOCALAPPDATA" "Programs\Ollama\ollama app.exe"
    if (Test-Path $app) { return $app }
    return $null
}

# Path of the ollama command-line program, or $null.
function Find-OllamaCli {
    Find-Program "ollama" @(
        (Join-Path "$env:LOCALAPPDATA" "Programs\Ollama\ollama.exe"),
        (Join-Path "$env:ProgramFiles" "Ollama\ollama.exe"))
}

# True if Ollama is installed in any form (tray app, CLI, or already answering).
function Test-OllamaInstalled {
    return [bool]((Find-OllamaApp) -or (Find-OllamaCli) -or (Test-Url "$OllamaApi/api/version"))
}

# Starts Ollama if it isn't answering yet. Returns $true when its API answers.
function Start-Ollama($waitSeconds = 30) {
    if (Test-Url "$OllamaApi/api/version") { return $true }
    $app = Find-OllamaApp
    $cli = Find-OllamaCli
    if ($app) { Start-Process $app }
    elseif ($cli) { Start-Process $cli -ArgumentList "serve" -WindowStyle Hidden }
    else { return $false }
    for ($i = 0; $i -lt $waitSeconds -and -not (Test-Url "$OllamaApi/api/version"); $i++) { Start-Sleep 1 }
    return (Test-Url "$OllamaApi/api/version")
}

# True if Ollama already has the model ("gemma4" also matches "gemma4:latest").
function Test-ModelInstalled($model) {
    try {
        $tags = (Invoke-RestMethod "$OllamaApi/api/tags" -TimeoutSec 5).models.name
        $want = if ($model.Contains(":")) { $model } else { "${model}:latest" }
        return ($tags -contains $model) -or ($tags -contains $want)
    } catch { return $false }
}

# Installs and starts Ollama, then downloads the model if needed. Returns $true when the coach is ready.
function Install-Ollama($model) {
    if (Test-OllamaInstalled) { Say "Ollama is installed." Green }
    else { Install-Package "Ollama.Ollama" "Ollama (runs the AI coach)" | Out-Null }
    if (-not (Start-Ollama)) {
        Say "Ollama isn't running. Everything except the AI coach will work; run Setup again later." Yellow
        return $false
    }
    Say "Ollama is running." Green

    if (Test-ModelInstalled $model) { Say "Model $model is downloaded." Green; return $true }
    $cli = Find-OllamaCli
    if (-not $cli) { Say "The ollama command wasn't found, so $model can't be downloaded. Retry from Settings in the app." Yellow; return $false }
    Say "Downloading $model (several GB, the first time only)..."
    & $cli pull $model | Out-Host
    if (Test-ModelInstalled $model) { Say "Model $model is downloaded." Green; return $true }
    Say "The model download didn't finish. You can retry from Settings in the app." Yellow
    return $false
}
