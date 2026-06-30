#!/bin/bash
set -e

echo "Validating production configuration..."

# Check required variables
required_vars=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET_KEY"
    "JWT_REFRESH_SECRET_KEY"
    "INTASEND_SECRET_KEY"
    "INTASEND_WEBHOOK_SECRET"
    "SENTRY_DSN"
)

if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
fi

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set"
        exit 1
    fi
done

# Ensure mock payments are not enabled
if [ "$INTASEND_MODE" = "mock" ]; then
    echo "ERROR: INTASEND_MODE cannot be 'mock' in production"
    exit 1
fi

# Ensure debug is off
if [ "$DEBUG" = "true" ]; then
    echo "ERROR: DEBUG must be 'false' in production"
    exit 1
fi

echo "Production configuration validated successfully."
