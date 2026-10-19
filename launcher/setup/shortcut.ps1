# Step: OpenFit shortcut on the Desktop (with the app icon).

# Creates the project and Desktop shortcuts unless the Desktop one already exists.
function Install-Shortcut($root, $name = "OpenFit") {
    $desktop = Join-Path ([Environment]::GetFolderPath("Desktop")) "$name.lnk"
    if (Test-Path $desktop) { Say "Desktop shortcut exists." Green; return $true }
    try {
        & (Join-Path $root "launcher\create-shortcut.ps1") -Desktop -Name $name | Out-Null
        Say "Added $name to your Desktop." Green
        return $true
    } catch {
        Say "Couldn't create the shortcut: $($_.Exception.Message)" Yellow
        return $false
    }
}
