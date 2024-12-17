from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

from .models import BusinessHours, CustomerProfile, ServiceItem, ServiceRequest, Vehicle


class BusinessHoursAdmin(admin.ModelAdmin):
    list_display = (
        "get_day_name",
        "is_open",
        "start_time",
        "end_time",
        "allow_after_hours_dropoff",
    )
    list_editable = ("is_open", "start_time", "end_time", "allow_after_hours_dropoff")
    ordering = ["day_of_week"]

    def get_day_name(self, obj):
        return dict(BusinessHours.DAYS_OF_WEEK)[obj.day_of_week]

    get_day_name.short_description = "Day"

    def has_add_permission(self, request):
        # Only allow adding if we don't have all 7 days
        count = BusinessHours.objects.count()
        return count < 7

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion to maintain 7 days
        return False


admin.site.register(BusinessHours, BusinessHoursAdmin)
admin.site.register(CustomerProfile)
admin.site.register(Vehicle)
admin.site.register(ServiceRequest)
admin.site.register(ServiceItem)
