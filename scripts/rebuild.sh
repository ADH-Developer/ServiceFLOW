#!/bin/bash

# Help message
show_help() {
    echo "Usage: ./rebuild.sh [options]"
    echo "Options:"
    echo "  -a, --all       Rebuild all containers"
    echo "  -c, --client    Rebuild client container"
    echo "  -s, --server    Rebuild server container"
    echo "  -d, --db        Rebuild database container"
    echo "  -r, --redis     Rebuild redis container"
    echo "  -h, --help      Show this help message"
    echo "  --no-cache      Build without using cache"
    echo
    echo "Example: ./rebuild.sh -cs     # Rebuild client and server"
    echo "         ./rebuild.sh -a      # Rebuild all containers"
}

# Initialize variables
rebuild_all=false
rebuild_client=false
rebuild_server=false
rebuild_db=false
rebuild_redis=false
no_cache=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--all)
            rebuild_all=true
            shift
            ;;
        -c|--client)
            rebuild_client=true
            shift
            ;;
        -s|--server)
            rebuild_server=true
            shift
            ;;
        -d|--db)
            rebuild_db=true
            shift
            ;;
        -r|--redis)
            rebuild_redis=true
            shift
            ;;
        --no-cache)
            no_cache="--no-cache"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# If no specific container is selected, show help
if [[ $rebuild_all == false && $rebuild_client == false && $rebuild_server == false && $rebuild_db == false && $rebuild_redis == false ]]; then
    show_help
    exit 1
fi

# Function to rebuild specific containers
rebuild_containers() {
    local containers=("$@")
    local command="docker compose -f docker-compose.dev.yml"
    
    # Stop the specified containers
    echo "Stopping containers..."
    $command stop "${containers[@]}"
    
    # Remove the specified containers
    echo "Removing containers..."
    $command rm -f "${containers[@]}"
    
    # Rebuild and start the specified containers
    echo "Rebuilding and starting containers..."
    if [ -n "$no_cache" ]; then
        $command build $no_cache "${containers[@]}"
    else
        $command build "${containers[@]}"
    fi
    $command up -d "${containers[@]}"
}

# Determine which containers to rebuild
containers=()

if [ "$rebuild_all" = true ]; then
    echo "Rebuilding all containers..."
    docker compose -f docker-compose.dev.yml down
    if [ -n "$no_cache" ]; then
        docker compose -f docker-compose.dev.yml build $no_cache
    else
        docker compose -f docker-compose.dev.yml build
    fi
    docker compose -f docker-compose.dev.yml up -d
else
    if [ "$rebuild_client" = true ]; then
        containers+=("client")
    fi
    if [ "$rebuild_server" = true ]; then
        containers+=("server")
    fi
    if [ "$rebuild_db" = true ]; then
        containers+=("db")
    fi
    if [ "$rebuild_redis" = true ]; then
        containers+=("redis")
    fi
    
    rebuild_containers "${containers[@]}"
fi

echo "Rebuild complete!" 