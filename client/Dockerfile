# Build stage
FROM node:18.19-alpine AS builder

# Set working directory
WORKDIR /app

# Install necessary build tools and global npm packages
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    && npm install -g ts-node typescript jest ts-jest @types/jest @jest/globals @types/node-fetch

# Create node user's home directory with correct permissions
RUN mkdir -p /home/node/.npm && chown -R node:node /home/node

# Install dependencies with caching
COPY package*.json ./
COPY tsconfig.json ./
RUN mkdir -p /app/node_modules && chown -R node:node /app

USER node
RUN npm install --legacy-peer-deps

# Copy source files with correct ownership
COPY --chown=node:node . .

# Create .next directory
RUN mkdir -p .next

# Development stage
FROM node:18.19-alpine AS development

# Install runtime tools and global packages
RUN apk add --no-cache bash zsh git \
    && npm install -g ts-node typescript jest ts-jest @types/jest @jest/globals @types/node-fetch

# Create node user's home directory with correct permissions
RUN mkdir -p /home/node/.npm && chown -R node:node /home/node

# Set up app directory with correct permissions
WORKDIR /app
RUN mkdir -p /app/node_modules /app/.next && chown -R node:node /app

# Switch to node user for all copy operations
USER node

# Copy from builder (all files are already owned by node:node)
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/tsconfig.json ./
COPY --from=builder --chown=node:node /app/jest.config.js ./
COPY --from=builder --chown=node:node /app/jest.setup.js ./
COPY --from=builder --chown=node:node /app/jest.api.config.cjs ./
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/components ./components
COPY --from=builder --chown=node:node /app/lib ./lib
COPY --from=builder --chown=node:node /app/pages ./pages
COPY --from=builder --chown=node:node /app/styles ./styles
COPY --from=builder --chown=node:node /app/types ./types
COPY --from=builder --chown=node:node /app/hooks ./hooks
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/themes ./themes
COPY --from=builder --chown=node:node /app/contexts ./contexts
COPY --from=builder --chown=node:node /app/utils ./utils
COPY --from=builder --chown=node:node /app/tests ./tests

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV WATCHPACK_POLLING=true

# Expose port 3000
EXPOSE 3000

# Default command
CMD ["npm", "run", "dev"]