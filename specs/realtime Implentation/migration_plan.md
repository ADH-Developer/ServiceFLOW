# Migration Plan: WebSocket to Socket.IO

## Current Implementation Analysis
- Backend uses Django Channels with AsyncWebsocketConsumer
- Frontend has direct WebSocket connections
- Two main WebSocket consumers: AppointmentConsumer and WorkflowConsumer
- Socket.IO implementation already partially exists (socket_io.py)
- Current setup includes Redis for WebSocket channel layer (to be removed)

## Migration Steps

### 1. Backend Changes

#### Remove WebSocket Implementation
1. Delete files:
   - `server/customers/consumers.py`
   - `server/customers/routing.py`
   - `server/server/routing.py`

2. Update ASGI configuration in `server/server/asgi.py`:
   - Remove Channels routing
   - Use Socket.IO ASGI app

3. Clean up dependencies in `requirements.txt`:
   - Remove `channels`
   - Remove `channels-redis`
   - Remove `redis`
   - Remove `daphne` (if not used elsewhere)
   - Ensure `python-socketio` is installed

#### Enhance Socket.IO Implementation
1. Migrate existing WebSocket events to Socket.IO:
   - Appointments namespace events:
     - pending_count
     - today_appointments
     - today_schedule (for admin dashboard)
   - Workflow namespace events:
     - board_update
     - card_move
     - card_update
     - column_update
     - comment_update
     - label_update

2. Update dependencies:
   - Remove channels
   - Ensure python-socketio is installed

3. Add new Socket.IO event handlers in `socket_io.py`:
   ```python
   @sio.on("schedule_update", namespace="/appointments")
   async def handle_schedule_update(sid, data):
       """Handle updates to today's schedule"""
       try:
           await socket_manager.emit_to_namespace(
               "appointments", "schedule_updated", data
           )
       except Exception as e:
           logger.error(f"Error handling schedule update: {str(e)}")
           await sio.emit(
               "error", {"message": str(e)}, room=sid, namespace="/appointments"
           )
   ```

### 2. Frontend Changes

#### Remove WebSocket Implementation
1. Remove WebSocket-related code from:
   - `client/pages/admin/dashboard/index.tsx`
   - Any other components using direct WebSocket connections

#### Implement Socket.IO Client
1. Update dependencies:
   - Add socket.io-client
   - Remove any WebSocket-specific packages

2. Use existing `useSocketIO` hook from `client/hooks/useSocketIO.ts`
   - Already implements connection management
   - Has error handling
   - Supports namespaces

3. Update components to use Socket.IO:
   - Replace WebSocket connections with useSocketIO hook
   - Update event handlers to use Socket.IO events
   - Implement reconnection logic using Socket.IO built-in features

4. Update Admin Dashboard:
   ```typescript
   // In admin dashboard component
   const { isConnected, on } = useSocketIO('appointments');

   useEffect(() => {
     // Listen for schedule updates
     const unsubscribe = on<ScheduleData>('schedule_updated', (data) => {
       setTodaySchedule(data);
     });

     return () => {
       unsubscribe();
     };
   }, [on]);
   ```

### 3. Docker Changes

#### Update Docker Compose Files
1. Remove Redis service from `docker-compose.yml` and `docker-compose.dev.yml`:
   ```yaml
   # Remove this entire block
   redis:
     image: redis:alpine
     ports:
       - "6379:6379"
   ```

2. Update backend service in Docker files:
   - Remove Redis service dependency
   - Remove Redis-related environment variables
   - Update any WebSocket-specific ports or configurations

3. Clean up Docker build process:
   - Remove Redis-related package installations
   - Update backend Dockerfile to remove unused dependencies

### 4. Customer Registration & Appointment Booking
The Socket.IO migration will not affect the customer registration and appointment booking process because:
- These processes use REST API endpoints, not real-time connections
- The only real-time aspect is notifying admin dashboard of new appointments
- Existing Socket.IO events (pending_count, today_appointments) already handle this

### 5. Environment Updates
1. Update environment variables:
   - Replace `NEXT_PUBLIC_WS_URL` with `NEXT_PUBLIC_API_URL`
   - Remove any WebSocket-specific configurations
   - Remove Redis-related environment variables:
     - `REDIS_URL`
     - `CHANNEL_LAYERS`
     - Any other Redis configuration variables

### 6. Testing Plan
1. Test Socket.IO connections:
   - Connection establishment
   - Reconnection handling
   - Error handling

2. Test real-time features:
   - Appointments updates
   - Today's schedule updates
   - Workflow updates
   - Card movements
   - Comments and labels

3. Test edge cases:
   - Network disconnections
   - Server restarts
   - Multiple clients

4. Test Docker setup:
   - Clean build from scratch
   - Development environment
   - Production environment
   - Container communication

### 7. Deployment Steps
1. Backend deployment:
   - Update dependencies
   - Deploy new Socket.IO configuration
   - Remove old WebSocket routes
   - Remove Redis service

2. Frontend deployment:
   - Update dependencies
   - Deploy new Socket.IO client implementation

3. Monitor:
   - Connection success rates
   - Event delivery
   - Error rates
   - Server resource usage (should be lower without Redis)

## Timeline Estimate
- Backend migration: 1-2 days
- Frontend migration: 2-3 days
- Docker cleanup: 1 day
- Testing: 2-3 days
- Deployment and monitoring: 1 day

Total: 7-10 days

## Notes
- Socket.IO implementation already exists, making migration easier
- Socket.IO provides better reconnection handling
- Migration can be done incrementally by namespace
- Existing Socket.IO hook provides good foundation for frontend changes
- Customer registration and appointment booking processes are unaffected
- Removing Redis will simplify the infrastructure and reduce maintenance overhead 