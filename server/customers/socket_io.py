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


class SocketManager:
    """Socket.IO Manager for handling namespace operations and event emission"""

    def __init__(self):
        self.sio = sio
        logger.info("SocketManager initialized")

    async def emit_to_namespace(self, namespace: str, event: str, data: any) -> None:
        """
        Emit event to all clients in a namespace

        Args:
            namespace: The target namespace
            event: The event name to emit
            data: The data payload to send
        """
        try:
            logger.info(
                f"[SocketManager] Emitting '{event}' to '/{namespace}' with {len(data) if isinstance(data, list) else 1} records"
            )
            await self.sio.emit(event, data, namespace=f"/{namespace}")
            logger.info(
                f"[SocketManager] Successfully emitted '{event}' to '/{namespace}'"
            )
        except Exception as e:
            logger.error(
                f"[SocketManager] Error emitting to namespace {namespace}: {str(e)}"
            )
            logger.exception(e)


socket_manager = SocketManager()
logger.info("Global socket_manager instance created")


@sync_to_async
def get_dashboard_schedule():
    """
    Fetch today's appointments for the dashboard

    Returns:
        List of serialized appointments for today
    """
    from customers.models import ServiceRequest
    from customers.serializers import ServiceRequestSerializer

    try:
        today_appointments = ServiceRequest.objects.filter(
            appointment_date=timezone.now().date()
        ).order_by("appointment_time")
        data = ServiceRequestSerializer(today_appointments, many=True).data
        logger.info(
            f"[get_dashboard_schedule] Retrieved {len(data)} appointments for today"
        )
        return data
    except Exception as e:
        logger.error(f"[get_dashboard_schedule] Error retrieving schedule: {str(e)}")
        logger.exception(e)
        raise


@sio.on("join")
async def handle_join(sid, namespace):
    """
    Handle client joining a namespace

    Args:
        sid: Session ID of the client
        namespace: The namespace being joined
    """
    logger.info(f"[handle_join] Client {sid} joining namespace: {namespace}")
    try:
        schedule_data = await get_dashboard_schedule()
        await socket_manager.emit_to_namespace(
            namespace, "dashboard_schedule_updated", schedule_data
        )
        logger.info(f"[handle_join] Successfully sent schedule to client {sid}")
    except Exception as e:
        logger.error(f"[handle_join] Error sending schedule to client {sid}: {str(e)}")
        logger.exception(e)


@sio.on("connect")
async def connect(sid, environ, auth=None):
    """
    Handle client connection and authentication

    Args:
        sid: Session ID of the client
        environ: WSGI environment
        auth: Authentication data containing namespace
    """
    if auth and "namespace" in auth:
        logger.info(
            f"[connect] Client {sid} connected to namespace: {auth['namespace']}"
        )
        await handle_join(sid, auth["namespace"])
    else:
        logger.warning(f"[connect] Client {sid} connected without namespace")


@sio.on("disconnect")
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"[disconnect] Client {sid} disconnected")


@sio.on("ping")
async def handle_ping(sid):
    """Handle ping from client to maintain connection"""
    await sio.emit("pong", room=sid)
    logger.debug(f"[handle_ping] Responded to ping from {sid}")


# Export the ASGI app
app = socketio.ASGIApp(sio)
logger.info("Socket.IO ASGI app created")
