# Step: Ollama (runs the AI coach on this PC) and the coach's model.

$OllamaApi = "http://127.0.0.1:11434"

# Path of the Ollama tray app, or $null if it isn't installed.
function Find-OllamaApp {
    $app = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama app.exe"
    if (Test-Path $app) { return $app }
    return $null
}

# Starts Ollama if it isn't answering yet. Returns $true when its API answers.
function Start-Ollama {
    if (Test-Url "$OllamaApi/api/version") { return $true }
    $app = Find-OllamaApp
    if (-not $app) { return $false }
    Start-Process $app
    for ($i = 0; $i -lt 30 -and -not (Test-Url "$OllamaApi/api/version"); $i++) { Start-Sleep 1 }
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
    if (-not (Find-OllamaApp) -and -not (Test-Url "$OllamaApi/api/version")) {
        Install-Package "Ollama.Ollama" "Ollama (runs the AI coach)" | Out-Null
    }
    if (-not (Start-Ollama)) {
        Say "Ollama isn't running. Everything except the AI coach will work; run Setup again later." Yellow
        return $false
    }
    Say "Ollama is running." Green

    if (Test-ModelInstalled $model) { Say "Model $model is downloaded." Green; return $true }
    if (-not (Test-Command ollama)) { Update-SessionPath }
    Say "Downloading $model (several GB, the first time only)..."
    ollama pull $model | Out-Host
    if (Test-ModelInstalled $model) { Say "Model $model is downloaded." Green; return $true }
    Say "The model download didn't finish. You can retry from Settings in the app." Yellow
    return $false
}
