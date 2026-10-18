# Step: Node.js (runs the OpenFit server).

# Installs Node.js LTS if missing. Returns $true when node is available.
function Install-Node {
    if (Test-Command node) { Say "Node.js $(node --version) is installed." Green; return $true }
    Install-Package "OpenJS.NodeJS.LTS" "Node.js LTS" | Out-Null
    if (Test-Command node) { Say "Node.js $(node --version) installed." Green; return $true }
    Say "Node.js couldn't be installed. Get it from https://nodejs.org, then run Setup again." Red
    return $false
}
