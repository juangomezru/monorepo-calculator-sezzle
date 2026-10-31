#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    # Gremlins v0.5.1 has a Windows path-separator bug in coverage mapping.
    docker run --rm --mount "type=bind,source=$(pwd -W 2>/dev/null || pwd),target=/app" \
      -w /app golang:1.22 go run github.com/go-gremlins/gremlins/cmd/gremlins@v0.5.1 unleash
    ;;
  *)
    go run github.com/go-gremlins/gremlins/cmd/gremlins unleash
    ;;
esac
