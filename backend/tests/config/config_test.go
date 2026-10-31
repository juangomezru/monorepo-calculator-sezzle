package config_test

import (
	"testing"

	"github.com/juangomezru/monorepo-calculator-sezzle/backend/internal/config"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("PORT", "")
	t.Setenv("CORS_ORIGIN", "")

	cfg := config.Load()

	if cfg.Port != "8080" {
		t.Fatalf("got port %q", cfg.Port)
	}
	if cfg.Addr() != ":8080" {
		t.Fatalf("got address %q", cfg.Addr())
	}
	if cfg.CORSOrigin != "" {
		t.Fatalf("got CORS origin %q", cfg.CORSOrigin)
	}
}

func TestLoadEnvironment(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("CORS_ORIGIN", "https://example.test")

	cfg := config.Load()

	if cfg.Port != "9090" {
		t.Fatalf("got port %q", cfg.Port)
	}
	if cfg.Addr() != ":9090" {
		t.Fatalf("got address %q", cfg.Addr())
	}
	if cfg.CORSOrigin != "https://example.test" {
		t.Fatalf("got CORS origin %q", cfg.CORSOrigin)
	}
}
