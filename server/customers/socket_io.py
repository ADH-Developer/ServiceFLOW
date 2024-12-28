import logging

import socketio
from asgiref.sync import sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)

# Create Socket.IO server instance
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True,
    ping_timeout=35,
    ping_interval=25,
)


# Socket.IO Manager for handling room/namespace operations
class SocketManager:
    def __init__(self):
        self.sio = sio
        logger.info("SocketManager initialized")

    async def emit_to_namespace(self, namespace: str, event: str, data: any) -> None:
        """Emit event to all clients in a namespace"""
        try:
            logger.info(
                f"[SocketManager] Emitting event '{event}' to namespace '/{namespace}' with data: {data}"
            )
            await self.sio.emit(event, data, namespace=f"/{namespace}")
            logger.info(
                f"[SocketManager] Successfully emitted event '{event}' to namespace '/{namespace}'"
            )
        except Exception as e:
            logger.error(
                f"[SocketManager] Error emitting to namespace {namespace}: {str(e)}"
            )
            logger.exception(e)


socket_manager = SocketManager()
logger.info("Global socket_manager instance created")


# Helper functions for async database operations
@sync_to_async
def get_pending_count():
    from customers.models import ServiceRequest

    try:
        count = ServiceRequest.objects.filter(status="pending").count()
        logger.info(f"[get_pending_count] Got pending count: {count}")
        return count
    except Exception as e:
        logger.error(f"[get_pending_count] Error getting pending count: {str(e)}")
        logger.exception(e)
        raise


@sync_to_async
def get_today_appointments():
    from customers.models import ServiceRequest
    from customers.serializers import ServiceRequestSerializer

    try:
        today_appointments = ServiceRequest.objects.filter(
            appointment_date=timezone.now().date()
        ).order_by("appointment_time")
        data = ServiceRequestSerializer(today_appointments, many=True).data
        logger.info(
            f"[get_today_appointments] Got today's appointments: {len(data)} appointments"
        )
        return data
    except Exception as e:
        logger.error(
            f"[get_today_appointments] Error getting today's appointments: {str(e)}"
        )
        logger.exception(e)
        raise


# Socket.IO event handlers
@sio.on("join")
async def handle_join(sid, namespace):
    """Handle client joining a namespace"""
    logger.info(f"[handle_join] Client {sid} joining namespace: {namespace}")
    try:
        # Send initial state
        logger.info(f"[handle_join] Getting initial state for client {sid}")
        pending_count = await get_pending_count()
        today_data = await get_today_appointments()

        logger.info(f"[handle_join] Emitting initial state to client {sid}")
        await socket_manager.emit_to_namespace(
            namespace, "pending_count_updated", {"count": pending_count}
        )
        await socket_manager.emit_to_namespace(
            namespace, "today_appointments_updated", today_data
        )
        logger.info(
            f"[handle_join] Successfully sent initial state to client {sid} in namespace {namespace}"
        )
    except Exception as e:
        logger.error(
            f"[handle_join] Error sending initial state to client {sid}: {str(e)}"
        )
        logger.exception(e)


@sio.on("connect")
async def connect(sid, environ, auth=None):
    """Handle client connection"""
    logger.info(f"[connect] Client {sid} connected with auth: {auth}")
    if auth and "namespace" in auth:
        logger.info(f"[connect] Client {sid} has namespace in auth, handling join")
        await handle_join(sid, auth["namespace"])
    else:
        logger.warning(f"[connect] Client {sid} connected without namespace in auth")


@sio.on("disconnect")
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"[disconnect] Client {sid} disconnected")


@sio.on("ping")
async def handle_ping(sid):
    """Handle ping from client"""
    logger.debug(f"[handle_ping] Received ping from client {sid}")
    await sio.emit("pong", room=sid)
    logger.debug(f"[handle_ping] Sent pong to client {sid}")


# Export the ASGI app
app = socketio.ASGIApp(sio)
logger.info("Socket.IO ASGI app created")
