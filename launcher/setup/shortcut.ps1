# Step: OpenFit shortcut on the Desktop (with the app icon).

# Creates the project and Desktop shortcuts unless the Desktop one already exists.
function Install-Shortcut($root) {
    $desktop = Join-Path ([Environment]::GetFolderPath("Desktop")) "OpenFit.lnk"
    if (Test-Path $desktop) { Say "Desktop shortcut exists." Green; return $true }
    try {
        & (Join-Path $root "launcher\create-shortcut.ps1") -Desktop | Out-Null
        Say "Added OpenFit to your Desktop." Green
        return $true
    } catch {
        Say "Couldn't create the shortcut: $($_.Exception.Message)" Yellow
        return $false
    }
}
