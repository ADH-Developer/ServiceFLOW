#!/bin/bash

# Stop the client container
docker compose -f docker-compose.dev.yml stop client

# Remove the client container
docker compose -f docker-compose.dev.yml rm -f client

# Rebuild the client image
docker compose -f docker-compose.dev.yml build client

# Start the client container
docker compose -f docker-compose.dev.yml up -d client

echo "Client container rebuilt and restarted" 