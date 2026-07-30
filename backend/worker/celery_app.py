from celery import Celery
from backend.core.config import settings

celery_app = Celery(
    "pricesneak_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["backend.worker.tasks.scraper", "backend.worker.tasks.schedules"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "global-scheduler-tick": {
            "task": "check_schedules_and_trigger_scrapes",
            "schedule": 600.0,  # runs every 600 seconds (10 minutes)
        }
    }
)

# Tasks are explicitly included in the Celery initialization
