FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip && pip install -r /tmp/requirements.txt

COPY . /app

RUN addgroup --system app && adduser --system --ingroup app app && chown -R app:app /app && chmod +x /app/entrypoint.sh

USER app

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
