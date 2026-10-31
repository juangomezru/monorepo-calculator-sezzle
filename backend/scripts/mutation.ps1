# Runs Gremlins. On Windows it uses the Linux container because Gremlins
# v0.5.1 has a path-separator bug when mapping Windows coverage profiles.
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if ($env:OS -eq "Windows_NT") {
    docker run --rm --mount "type=bind,source=$root,target=/app" -w /app golang:1.22 `
        go run github.com/go-gremlins/gremlins/cmd/gremlins@v0.5.1 unleash
} else {
    Push-Location $root
    try {
        go run github.com/go-gremlins/gremlins/cmd/gremlins unleash
    } finally {
        Pop-Location
    }
}
