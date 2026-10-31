package config

import "os"

const defaultPort = "8080"

type Config struct {
	Port       string
	CORSOrigin string
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}
	return Config{
		Port:       port,
		CORSOrigin: os.Getenv("CORS_ORIGIN"),
	}
}

func (c Config) Addr() string {
	return ":" + c.Port
}
