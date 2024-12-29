from rest_framework import permissions


class IsStaffOrOwner(permissions.BasePermission):
    """
    Custom permission to only allow staff or owners of an object to access it.
    """

    def has_object_permission(self, request, view, obj):
        # Staff can access any object
        if request.user.is_staff:
            return True

        # Check if the object has a user field directly or through a customer field
        if hasattr(obj, "user"):
            return obj.user == request.user
        elif hasattr(obj, "customer") and hasattr(obj.customer, "user"):
            return obj.customer.user == request.user

        return False

    def has_permission(self, request, view):
        # Staff can access any view
        if request.user.is_staff:
            return True

        # For list views, only allow staff
        if view.action == "list":
            return False

        # For other actions, allow authenticated users
        return request.user and request.user.is_authenticated
