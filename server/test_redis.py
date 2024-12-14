import redis
from django.conf import settings
from django.core.cache import cache


def test_redis_connection():
    try:
        # Print configuration
        print(f"Redis Host: {settings.REDIS_HOST}")
        print(f"Redis Port: {settings.REDIS_PORT}")

        # Test Django cache
        print("\nTesting Django cache...")
        cache.set("test_key", "Hello from Django!", timeout=30)
        value = cache.get("test_key")
        print(f"Retrieved value: {value}")

        if value == "Hello from Django!":
            print("✅ Redis connection successful!")
        else:
            print("❌ Redis test failed: Value mismatch")

    except Exception as e:
        print("❌ Redis connection failed!")
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    import os

    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")
    django.setup()

    test_redis_connection()
