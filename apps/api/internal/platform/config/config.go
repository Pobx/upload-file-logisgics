package config

import (
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	Port            string `env:"PORT" envDefault:"8080"`
	Env             string `env:"APP_ENV" envDefault:"development"`
	LogLevel        string `env:"LOG_LEVEL" envDefault:"info"`
	DatabaseURL     string `env:"DATABASE_URL" envDefault:"postgres://docsearch:docsearch@localhost:5432/docsearch_app?sslmode=disable"`
	DBMaxConns      int32  `env:"DB_MAX_CONNS" envDefault:"20"`
	DBMinConns      int32  `env:"DB_MIN_CONNS" envDefault:"2"`
	DBConnectRetry  time.Duration `env:"DB_CONNECT_RETRY" envDefault:"2m"`
	ConnectTimeout  time.Duration `env:"DB_CONNECT_TIMEOUT" envDefault:"3s"`
	AcquireTimeout  time.Duration `env:"DB_ACQUIRE_TIMEOUT" envDefault:"2s"`
	QueryTimeout    time.Duration `env:"DB_QUERY_TIMEOUT" envDefault:"5s"`

	KeycloakURL     string `env:"KEYCLOAK_URL" envDefault:"http://localhost:8080/auth"`
	KeycloakRealm   string `env:"KEYCLOAK_REALM" envDefault:"docsearch"`
	KeycloakClientID string `env:"KEYCLOAK_CLIENT_ID" envDefault:"docsearch-api"`

	StorageProvider string `env:"STORAGE_PROVIDER" envDefault:"sftp"`
	RunWorkers      bool   `env:"RUN_WORKERS" envDefault:"false"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
