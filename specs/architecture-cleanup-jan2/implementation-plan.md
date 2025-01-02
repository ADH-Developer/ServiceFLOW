# Architecture Cleanup Implementation Plan - January 2024

## Current State Analysis

### Frontend Issues
- Mixed Next.js and Create React App (CRA) configurations
- Client crashes due to Babel configuration issues
- WebSocket connection issues with the backend
- Redundant Next.js API layer removed but leaving residual configuration

### Development Environment
- Docker-based development setup
- Volume mounts for hot reloading
- Node.js 16.20.2 with npm 8.19.4
- Local file updates sync to containers

## Implementation Goals
1. Clean up frontend architecture to pure Next.js
2. Fix client stability issues
3. Ensure direct communication between Next.js frontend and Django backend
4. Maintain development workflow with Docker

## Implementation Phases

### Phase 1: Frontend Architecture Cleanup
1. Remove CRA dependencies:
   - Remove react-scripts
   - Remove CRA-specific configurations
   - Clean up package.json scripts

2. Setup proper Next.js configuration:
   - Update next.config.js for development needs
   - Configure TypeScript properly for Next.js
   - Update build and dev scripts
   - Remove any remaining Next.js API routes

3. Update Docker configuration:
   - Modify client Dockerfile.dev for Next.js
   - Update volume mounts in docker-compose.dev.yml
   - Configure hot reloading for Next.js

### Phase 2: Client Stability
1. Clean up Babel configuration:
   - Remove explicit Babel dependencies
   - Let Next.js handle Babel configuration
   - Update TypeScript configuration for Next.js

2. Update frontend dependencies:
   - Clean up package.json
   - Update to compatible versions of all packages
   - Remove unused dependencies

3. Fix WebSocket connection:
   - Update WebSocket hook for Next.js
   - Implement proper connection lifecycle
   - Add reconnection logic

### Phase 3: Frontend-Backend Integration
1. Direct communication setup:
   - Configure CORS properly in Django
   - Update API client configuration
   - Implement proper error handling

2. WebSocket integration:
   - Update Django Channels configuration
   - Implement proper WebSocket authentication
   - Add connection status monitoring

3. Development workflow:
   - Update development scripts
   - Configure proper environment variables
   - Document development workflow

## Implementation Details

### Docker Configuration Updates
```dockerfile
# client/Dockerfile.dev
FROM node:16.20.2-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    // Add any necessary webpack configurations
    return config;
  },
}
```

### WebSocket Connection
```typescript
// hooks/useWebSocket.ts
const useWebSocket = (url: string) => {
  // Updated WebSocket implementation for Next.js
};
```

## Success Criteria
1. Client runs stably without crashes
2. Next.js development server working properly
3. WebSocket connections maintain stability
4. Hot reloading working in development
5. Clean architecture with no mixed configurations

## Rollback Plan
- Each phase can be reverted independently
- Docker configurations versioned
- Package.json changes tracked
- Configuration files backed up

## Notes
- Focus on one phase at a time
- Test each change in development environment
- Maintain working development workflow
- Document any required manual steps
