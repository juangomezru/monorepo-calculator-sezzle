//go:build tools

package tools

// Gremlins is installed as a module tool so mutation testing is reproducible.
// Run it with: go run github.com/go-gremlins/gremlins/cmd/gremlins unleash
import _ "github.com/go-gremlins/gremlins/cmd/gremlins"
