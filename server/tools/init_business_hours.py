import os
import sys
from datetime import time

# Add the project root directory to the Python path
sys.path.append("/src")

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")

import django

django.setup()

from customers.models import BusinessHours


def get_user_input(
    day, default_start, default_end, default_is_open, default_after_hours
):
    """Get user input for business hours or use defaults"""
    print(f"\nConfiguring {day}:")
    use_default = input(f"Use default settings for {day}? (Y/n): ").lower() != "n"

    if use_default:
        return {
            "is_open": default_is_open,
            "start": default_start,
            "end": default_end,
            "after_hours": default_after_hours,
        }

    is_open = input(f"Is {day} open? (y/N): ").lower() == "y"
    if not is_open:
        return {"is_open": False, "start": None, "end": None, "after_hours": False}

    start = (
        input(f"Enter opening time (HH:MM, default {default_start}): ") or default_start
    )
    end = input(f"Enter closing time (HH:MM, default {default_end}): ") or default_end
    after_hours = input(f"Allow after-hours dropoff? (y/N): ").lower() == "y"

    return {"is_open": True, "start": start, "end": end, "after_hours": after_hours}


# Default business hours
default_hours = [
    # Monday-Friday: 8 AM - 6 PM
    {
        "day": 0,
        "is_open": True,
        "start": "08:00",
        "end": "18:00",
        "after_hours": True,
    },  # Monday
    {
        "day": 1,
        "is_open": True,
        "start": "08:00",
        "end": "18:00",
        "after_hours": True,
    },  # Tuesday
    {
        "day": 2,
        "is_open": True,
        "start": "08:00",
        "end": "18:00",
        "after_hours": True,
    },  # Wednesday
    {
        "day": 3,
        "is_open": True,
        "start": "08:00",
        "end": "18:00",
        "after_hours": True,
    },  # Thursday
    {
        "day": 4,
        "is_open": True,
        "start": "08:00",
        "end": "18:00",
        "after_hours": True,
    },  # Friday
    # Saturday: 9 AM - 2 PM
    {
        "day": 5,
        "is_open": True,
        "start": "09:00",
        "end": "14:00",
        "after_hours": False,
    },  # Saturday
    # Sunday: Closed
    {
        "day": 6,
        "is_open": False,
        "start": None,
        "end": None,
        "after_hours": False,
    },  # Sunday
]

days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Check if we should use interactive mode
interactive = os.environ.get("INTERACTIVE_SETUP", "").lower() == "true"

try:
    print("Initializing business hours...")

    # Clear existing business hours
    BusinessHours.objects.all().delete()

    for hours in default_hours:
        day_name = days[hours["day"]]

        if interactive:
            # Get user input or use defaults
            config = get_user_input(
                day_name,
                hours["start"],
                hours["end"],
                hours["is_open"],
                hours["after_hours"],
            )
        else:
            # Use defaults
            config = {
                "is_open": hours["is_open"],
                "start": hours["start"],
                "end": hours["end"],
                "after_hours": hours["after_hours"],
            }

        # Create business hours
        business_hours = BusinessHours.objects.create(
            day_of_week=hours["day"],
            is_open=config["is_open"],
            start_time=time.fromisoformat(config["start"]) if config["start"] else None,
            end_time=time.fromisoformat(config["end"]) if config["end"] else None,
            allow_after_hours_dropoff=config["after_hours"],
        )

        print(f"Created business hours for {day_name}")

    print("\nBusiness hours initialization complete!")
except Exception as e:
    print(f"Error initializing business hours: {str(e)}", file=sys.stderr)
    sys.exit(1)
