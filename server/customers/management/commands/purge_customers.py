from customers.models import CustomerProfile, ServiceRequest
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Purges all customer accounts while preserving superusers"

    def handle(self, *args, **kwargs):
        try:
            with transaction.atomic():
                # First, get all service requests for these customers
                service_requests = ServiceRequest.objects.all()

                # Delete workflow cards directly using SQL
                # This handles the case where the model isn't available but DB records exist
                with connection.cursor() as cursor:
                    try:
                        cursor.execute(
                            "DELETE FROM workflow_card WHERE service_request_id IN (SELECT id FROM customers_servicerequest)"
                        )
                        workflow_count = cursor.rowcount
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Could not delete workflow cards: {str(e)}"
                            )
                        )
                        workflow_count = 0

                # Delete all service requests
                request_count = service_requests.delete()[0]

                # Delete all customer profiles
                customer_count = CustomerProfile.objects.count()
                CustomerProfile.objects.all().delete()

                # Delete all non-superuser accounts
                user_count = User.objects.filter(is_superuser=False).count()
                User.objects.filter(is_superuser=False).delete()

                success_message = (
                    f"Successfully purged:\n"
                    f"- {request_count} service requests\n"
                    f"- {customer_count} customer profiles\n"
                    f"- {user_count} user accounts"
                )
                if workflow_count:
                    success_message = (
                        f"Successfully purged:\n"
                        f"- {workflow_count} workflow cards\n" + success_message[18:]
                    )

                self.stdout.write(self.style.SUCCESS(success_message))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error purging customers: {str(e)}"))
