FROM node:18.19-alpine

WORKDIR /app

# Install bash and other necessary tools
RUN apk update \
    && apk upgrade \
    && apk add --no-cache --upgrade bash zsh

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Create .next directory with correct permissions
RUN mkdir -p .next && chown -R node:node /app

# Switch to non-root user
USER node

# Expose port 3000
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]