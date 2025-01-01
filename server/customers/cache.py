import logging
from typing import Dict, List

from django.core.cache import cache
from django.db.models import Max

logger = logging.getLogger(__name__)

PENDING_COUNT_KEY = "pending_appointments_count"
TODAY_APPOINTMENTS_KEY = "today_appointments"
DEFAULT_TTL = 60 * 5  # 5 minutes default


class AppointmentCache:
    @staticmethod
    def get_cache_ttl():
        from django.conf import settings

        return getattr(settings, "CACHE_TTL", DEFAULT_TTL)

    @staticmethod
    def get_pending_count():
        """Get pending appointments count from cache"""
        try:
            count = cache.get(PENDING_COUNT_KEY)
            if count is None:
                from customers.models import ServiceRequest

                count = ServiceRequest.objects.filter(status="pending").count()
                cache.set(PENDING_COUNT_KEY, count, AppointmentCache.get_cache_ttl())
            return count
        except Exception as e:
            logger.error(f"Error getting pending count from cache: {e}")
            return None

    @staticmethod
    def get_today_appointments():
        """Get today's appointments from cache"""
        try:
            appointments = cache.get(TODAY_APPOINTMENTS_KEY)
            if appointments is None:
                from datetime import date

                from customers.models import ServiceRequest
                from customers.serializers import ServiceRequestSerializer

                today = date.today()
                appointments_queryset = (
                    ServiceRequest.objects.filter(appointment_date=today)
                    .select_related("customer__user", "vehicle")
                    .prefetch_related("services")
                    .order_by("appointment_time")
                )
                serializer = ServiceRequestSerializer(appointments_queryset, many=True)
                appointments = serializer.data
                cache.set(
                    TODAY_APPOINTMENTS_KEY,
                    appointments,
                    AppointmentCache.get_cache_ttl(),
                )
            return appointments
        except Exception as e:
            logger.error(f"Error getting today's appointments from cache: {e}")
            return None

    @staticmethod
    def update_cache():
        """Update both caches"""
        try:
            from datetime import date

            from customers.models import ServiceRequest
            from customers.serializers import ServiceRequestSerializer

            # Update pending count
            count = ServiceRequest.objects.filter(status="pending").count()
            cache.set(PENDING_COUNT_KEY, count, AppointmentCache.get_cache_ttl())

            # Update today's appointments
            today = date.today()
            appointments_queryset = (
                ServiceRequest.objects.filter(appointment_date=today)
                .select_related("customer__user", "vehicle")
                .prefetch_related("services")
                .order_by("appointment_time")
            )
            serializer = ServiceRequestSerializer(appointments_queryset, many=True)
            appointments = serializer.data
            cache.set(
                TODAY_APPOINTMENTS_KEY, appointments, AppointmentCache.get_cache_ttl()
            )

            return count, appointments
        except Exception as e:
            logger.error(f"Error updating cache: {e}")
            return None, None

    @staticmethod
    def invalidate_cache():
        """Invalidate both caches"""
        try:
            cache.delete(PENDING_COUNT_KEY)
            cache.delete(TODAY_APPOINTMENTS_KEY)
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")


class WorkflowCache:
    """Cache handler for workflow board state"""

    BOARD_KEY = "workflow:board"
    COLUMN_KEY = "workflow:column:{}"
    POSITION_KEY = "workflow:positions:{}"

    @classmethod
    def get_board_state(cls) -> Dict:
        """Get the entire board state from cache or DB"""
        board_state = cache.get(cls.BOARD_KEY)
        if not board_state:
            board_state = cls._rebuild_board_state()
        return board_state

    @classmethod
    def _rebuild_board_state(cls) -> Dict:
        """Rebuild the entire board state from the database"""
        try:
            # Import here to avoid circular import
            from .models import ServiceRequest

            # Get all service requests grouped by column
            columns = {}
            for column, _ in ServiceRequest.WORKFLOW_COLUMN_CHOICES:
                requests = (
                    ServiceRequest.objects.filter(workflow_column=column)
                    .select_related("customer__user", "vehicle")
                    .prefetch_related("services")
                    .order_by("workflow_position")
                )
                # Store both id and position to maintain order
                columns[column] = [
                    {"id": req.id, "position": req.workflow_position}
                    for req in requests
                ]

            # Cache the result
            cache.set(cls.BOARD_KEY, columns, timeout=3600)  # 1 hour timeout
            return columns

        except Exception as e:
            logger.error(f"Error rebuilding board state: {e}")
            return {}

    @classmethod
    def move_card(cls, request_id: int, to_column: str, position: int) -> bool:
        """Move a card to a new position/column"""
        try:
            # Get current board state
            board_state = cls.get_board_state()

            # Find and remove card from current column
            card_data = None
            for column, cards in board_state.items():
                for i, card in enumerate(cards):
                    if card["id"] == request_id:
                        card_data = cards.pop(i)
                        break
                if card_data:
                    break

            # Add card to new column at position
            if to_column not in board_state:
                board_state[to_column] = []

            target_column = board_state[to_column]
            new_card_data = {"id": request_id, "position": position}

            if position >= len(target_column):
                target_column.append(new_card_data)
            else:
                target_column.insert(position, new_card_data)

            # Update cache
            cache.set(cls.BOARD_KEY, board_state, timeout=3600)
            return True

        except Exception as e:
            logger.error(f"Error moving card {request_id}: {e}")
            return False

    @classmethod
    def get_next_position(cls, column: str) -> int:
        """Get the next available position in a column"""
        try:
            board_state = cls.get_board_state()
            column_cards = board_state.get(column, [])

            if not column_cards:
                return 0

            max_position = max(card["position"] for card in column_cards)
            return max_position + 1

        except Exception as e:
            logger.error(f"Error getting next position: {e}")
            return 0
