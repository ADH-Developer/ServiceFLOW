#!/bin/sh

echo "Waiting for database..."
while ! python manage.py check --database default > /dev/null 2>&1; do
    sleep 1
done

echo "Database is ready!"

echo "Running makemigrations..."
python manage.py makemigrations

echo "Running migrations..."
python manage.py migrate

echo "Creating superuser..."
python manage.py shell < tools/create_superuser.py

echo "Initializing business hours..."
python manage.py shell < tools/init_business_hours.py
if [ $? -ne 0 ]; then
    echo "Failed to initialize business hours"
    exit 1
fi

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "All initialization complete!"