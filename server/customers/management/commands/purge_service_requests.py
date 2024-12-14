from customers.models import ServiceRequest
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = "Purges service requests from the database with various filtering options"

    def add_arguments(self, parser):
        parser.add_argument(
            "--status",
            type=str,
            help="Filter by status (pending, confirmed, in_progress, completed, cancelled)",
        )
        parser.add_argument(
            "--before",
            type=str,
            help="Purge requests created before this date (YYYY-MM-DD)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Purge all service requests (use with caution)",
        )

    def handle(self, *args, **options):
        try:
            # Start building the queryset
            queryset = ServiceRequest.objects.all()

            # Apply filters based on options
            if options["status"]:
                if options["status"] not in dict(ServiceRequest.STATUS_CHOICES):
                    raise CommandError(f"Invalid status: {options['status']}")
                queryset = queryset.filter(status=options["status"])
                self.stdout.write(f"Filtering by status: {options['status']}")

            if options["before"]:
                try:
                    before_date = timezone.datetime.strptime(
                        options["before"], "%Y-%m-%d"
                    ).date()
                    queryset = queryset.filter(created_at__date__lt=before_date)
                    self.stdout.write(f"Filtering by date before: {before_date}")
                except ValueError:
                    raise CommandError("Invalid date format. Use YYYY-MM-DD")

            if not options["all"] and not options["status"] and not options["before"]:
                raise CommandError(
                    "You must specify at least one filter (--status, --before) or use --all"
                )

            # Count the requests that will be affected
            count = queryset.count()

            if options["dry_run"]:
                self.stdout.write(
                    self.style.WARNING(
                        f"DRY RUN: Would delete {count} service request(s)"
                    )
                )
                # Show what would be deleted
                for request in queryset:
                    self.stdout.write(
                        f"Would delete: {request} (ID: {request.id}, Status: {request.status})"
                    )
                return

            # Confirm deletion if not in dry run
            if count > 0:
                self.stdout.write(
                    self.style.WARNING(f"About to delete {count} service request(s)")
                )
                confirm = input("Are you sure you want to continue? [y/N] ")
                if confirm.lower() != "y":
                    self.stdout.write(self.style.ERROR("Operation cancelled"))
                    return

            # Perform the deletion within a transaction
            with transaction.atomic():
                # Delete related ServiceItems first (they should be cascade deleted, but being explicit)
                deleted_items = 0
                for request in queryset:
                    deleted_items += request.services.count()

                deleted_count = queryset.delete()[0]

                self.stdout.write(
                    self.style.SUCCESS(
                        f"Successfully deleted {deleted_count} service request(s) and {deleted_items} service item(s)"
                    )
                )

        except Exception as e:
            raise CommandError(f"An error occurred: {str(e)}")
