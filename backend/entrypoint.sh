#!/bin/sh
set -eu

python - <<'PY'
import os
import time

import psycopg2
from psycopg2 import OperationalError

config = {
    "dbname": os.getenv("DB_NAME", "project"),
    "user": os.getenv("DB_USER", "user"),
    "password": os.getenv("DB_PASSWORD", "mypassword"),
    "host": os.getenv("DB_HOST", "db"),
    "port": os.getenv("DB_PORT", "5432"),
    "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "5")),
}

for attempt in range(1, 31):
    try:
        conn = psycopg2.connect(**config)
        conn.close()
        print("PostgreSQL connection established.")
        break
    except OperationalError:
        print(f"PostgreSQL unavailable ({attempt}/30), retrying...")
        time.sleep(2)
else:
    raise SystemExit("PostgreSQL did not become available in time.")
PY

python manage.py migrate --noinput
python manage.py seed_initial_users

if [ "${DJANGO_COLLECTSTATIC:-1}" = "1" ]; then
    python manage.py collectstatic --noinput
fi

if [ "$#" -eq 0 ]; then
    set -- gunicorn backend.wsgi:application \
        --bind 0.0.0.0:8000 \
        --workers "${GUNICORN_WORKERS:-3}" \
        --timeout "${GUNICORN_TIMEOUT:-60}" \
        --access-logfile - \
        --error-logfile -
fi

exec "$@"
