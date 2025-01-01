# Django Channels Implementation Plan

## Current State Analysis

### Admin Dashboard Features
- Today's appointments display
- Today's schedule display
- Both use same endpoint currently
- No real-time updates implemented correctly

### Workflow Board Features
- Card movement between columns
- Card position tracking within columns
- Columns: estimates, in_progress, waiting_parts, completed
- No real-time updates implemented correctly

## Implementation Goals
1. Implement real-time updates for admin dashboard appointments
2. Implement real-time updates for workflow board
3. Provide fallback polling when WebSocket connection fails
4. Keep implementation simple and maintainable

## Implementation Steps

### 1. Backend Setup

#### Django Channels Configuration
1. Install dependencies:
   ```
   channels==4.0.0
   ```

2. Configure channel layers:
   ```python
   # settings.py
   CHANNEL_LAYERS = {
       "default": {
           "BACKEND": "channels.layers.InMemoryChannelLayer"
       }
   }
   ```

3. Update ASGI configuration:
   ```python
   # server/asgi.py
   from channels.routing import ProtocolTypeRouter, URLRouter
   from channels.auth import AuthMiddlewareStack
   from django.core.asgi import get_asgi_application
   from customers.routing import websocket_urlpatterns

   application = ProtocolTypeRouter({
       "http": get_asgi_application(),
       "websocket": AuthMiddlewareStack(
           URLRouter(websocket_urlpatterns)
       ),
   })
   ```

#### Implement Consumers
1. Create appointment consumer:
   ```python
   # customers/consumers/appointment_consumer.py
   class AppointmentConsumer(AsyncJsonWebsocketConsumer):
       async def connect(self):
           await self.channel_layer.group_add("appointments", self.channel_name)
           await self.accept()
           
           # Send initial data
           today_data = await self.get_today_data()
           await self.send_json({
               "type": "today_appointments",
               "data": today_data
           })
       
       async def disconnect(self, close_code):
           await self.channel_layer.group_discard("appointments", self.channel_name)
       
       async def today_appointments(self, event):
           await self.send_json(event)
   ```

2. Create workflow consumer:
   ```python
   # customers/consumers/workflow_consumer.py
   class WorkflowConsumer(AsyncJsonWebsocketConsumer):
       async def connect(self):
           await self.channel_layer.group_add("workflow", self.channel_name)
           await self.accept()
           
           # Send initial board state
           board_state = await self.get_board_state()
           await self.send_json({
               "type": "board_state",
               "data": board_state
           })
       
       async def receive_json(self, content):
           if content["type"] == "move_card":
               await self.handle_card_move(content["data"])
   ```

### 2. Frontend Implementation

#### Create WebSocket Hook
```typescript
// hooks/useRealtimeData.ts
const useRealtimeData = (path: string) => {
    const [data, setData] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // WebSocket connection with polling fallback
    useEffect(() => {
        const connect = () => {
            const ws = new WebSocket(`ws://${window.location.host}/ws/${path}`);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                stopPolling();
            };

            ws.onclose = () => {
                setIsConnected(false);
                startPolling();
                setTimeout(connect, 5000);
            };

            ws.onmessage = (event) => {
                const newData = JSON.parse(event.data);
                setData(newData);
            };
        };

        connect();
        return () => {
            wsRef.current?.close();
            stopPolling();
        };
    }, [path]);

    return { data, isConnected };
};
```

#### Update Components

1. Admin Dashboard:
```typescript
// components/Dashboard/AdminDashboard.tsx
const AdminDashboard = () => {
    const { data: appointments, isConnected } = useRealtimeData('appointments');
    
    return (
        <Box>
            <TodayAppointments 
                appointments={appointments} 
                isLive={isConnected} 
            />
        </Box>
    );
};
```

2. Workflow Board:
```typescript
// components/Workflow/WorkflowBoard.tsx
const WorkflowBoard = () => {
    const { data: boardState, isConnected } = useRealtimeData('workflow');
    
    const handleCardMove = async (cardId: string, source: string, destination: string) => {
        // Handle card movement
    };
    
    return (
        <DndContext onDragEnd={handleDragEnd}>
            {/* Board implementation */}
        </DndContext>
    );
};
```

### 3. Event Handling

#### Appointment Events
1. Create appointment
2. Update appointment
3. Delete appointment

#### Workflow Events
1. Move card between columns
2. Reorder cards within column

### 4. Testing Plan

1. Unit Tests:
   - Consumer connection/disconnection
   - Message handling
   - Group management

2. Integration Tests:
   - Real-time updates
   - Fallback polling
   - Reconnection handling

3. End-to-End Tests:
   - Appointment creation flow
   - Card movement flow
   - Connection loss scenarios

## Timeline
1. Backend Implementation: 2 days
   - Django Channels setup
   - Consumer implementation
   - Event handling

2. Frontend Implementation: 2 days
   - WebSocket hook
   - Component updates
   - Error handling

3. Testing & Refinement: 1 day
   - Testing implementation
   - Bug fixes
   - Performance optimization

Total: 5 days

## Success Criteria
1. Real-time updates working for appointments and workflow
2. Fallback polling functioning when WebSocket disconnects
3. Smooth reconnection handling
4. No data loss during connection issues
5. Clean and maintainable code structure 