# ServiceFLOW Technical Specification

## 1. Introduction

ServiceFLOW (Flexible Logistics Operations Workflows) is an open-source web application designed to revolutionize service shop operations through enhanced transparency, streamlined workflows, and improved communication. The system addresses key challenges in modern service shops: maintaining customer trust, optimizing workflows, and fostering transparency across teams.

## 2. System Architecture

### 2.1 Core Components

The application follows a microservices architecture with three primary services:

1. **Frontend Service (Client)**
   - Built with Next.js 14.0.4 and React 18.2.0
   - TypeScript-based for type safety
   - Chakra UI for modern, responsive design
   - Real-time updates via Django Channels WebSocket

2. **Backend Service (Server)**
   - Django REST Framework
   - Python 3.9
   - Django Channels for WebSocket communication
   - JWT-based authentication
   - Djoser for user management
   - API documentation via Swagger

3. **Database Service**
   - PostgreSQL
   - Persistent data storage
   - Handles user data, work orders, and system state

### 2.2 Key Technical Features

- **Role-Based Access Control**
  - Separate dashboards for mechanics, advisors, and managers
  - Permission-based feature access
  - Secure authentication flow

- **Real-Time Communication**
  - Django Channels WebSocket integration
  - Live updates for appointments and workflow changes
  - Fallback polling mechanism for connection issues
  - Asynchronous consumer handling

- **Visual Documentation System**
  - Photo/video upload capabilities
  - Secure storage and retrieval
  - Integration with work orders

## 3. Development Environment

### 3.1 Docker Configuration

All services are containerized using Docker:

```yaml
# Development Environment
- Client Container: Node 16.20.2 (Alpine)
- Server Container: Python 3.9 (Slim Bullseye)
- Database Container: PostgreSQL
```

### 3.2 Development Workflow

1. **Local Setup**
   ```bash
   git clone https://github.com/ADH-Developer/serviceFLOW.git
   cd serviceFLOW
   docker-compose -f docker-compose.dev.yml build
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Hot Reloading**
   - Configured for both frontend and backend
   - Volume mounts for local development
   - WATCHPACK_POLLING enabled for Next.js

### 3.3 Testing Infrastructure

- Jest configuration for frontend testing
- TypeScript integration
- WebSocket mocking capabilities
- API endpoint testing
- Integration tests planned post-MVP

## 4. Frontend Architecture

### 4.1 Next.js Configuration

- TypeScript-based implementation
- Strict type checking enabled
- Modern module resolution (bundler)
- API rewrite rules for backend communication

### 4.2 Component Structure

- Role-based dashboards
- Trello-style workflow board
- Visual inspection interface
- Parts management system

### 4.3 State Management

- Real-time data synchronization
- WebSocket connection management
- Fallback mechanisms for connection issues
- Channel group management for broadcasts

## 5. Backend Architecture

### 5.1 Django REST Framework

- API-first design
- JWT authentication
- Swagger documentation
- Modular app structure

### 5.2 Data Models

- User management
- Work orders
- Appointments
- Parts inventory
- Visual documentation

### 5.3 Real-Time Features

- Django Channels AsyncWebsocketConsumer implementation
- Appointment updates through WebSocket channels
- Workflow state changes via channel layers
- Card movement tracking with real-time updates
- Position management with broadcast capabilities

## 6. Security Considerations

- JWT-based authentication
- Role-based access control
- Secure file uploads
- API endpoint protection
- Environment variable management

## 7. Deployment Strategy

### 7.1 Container Orchestration

- Docker Compose for development
- Production-ready container configuration
- Volume management for persistence

### 7.2 Environment Configuration

- Separate dev/prod configurations
- Environment variable management
- Secrets handling


## 9. Maintenance and Support

### 9.1 Monitoring

- Error tracking
- Performance monitoring
- User activity logging

### 9.2 Backup Strategy

- Database backups
- File system backups
- Recovery procedures
