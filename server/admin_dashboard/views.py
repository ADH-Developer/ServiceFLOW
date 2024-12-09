from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_roles(request):
    roles = request.user.groups.values_list("name", flat=True)
    return Response({"roles": list(roles)})
