FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

CMD python manage.py migrate --noinput \
 && python manage.py collectstatic --noinput \
 && gunicorn backend.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --log-level info
