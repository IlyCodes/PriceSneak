FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# The playwright image already has the browsers installed, 
# but if we need to ensure specific binaries are linked:
RUN playwright install chromium

# Copy the entire backend source code
# We copy it into /app/backend so that python imports like "from backend.core..." work natively
COPY . /app/backend

# Set the python path so imports resolve correctly from /app
ENV PYTHONPATH=/app

# Default command (can be overridden by docker-compose)
CMD ["celery", "-A", "backend.worker.celery_app", "worker", "--loglevel=info"]
