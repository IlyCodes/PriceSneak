from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings


class MongoDB:
    client: AsyncIOMotorClient = None
    db = None


mongodb = MongoDB()


async def connect_to_mongo():
    mongodb.client = AsyncIOMotorClient(settings.MONGO_URI)
    mongodb.db = mongodb.client[settings.MONGO_DB]
    print("Connected to MongoDB.")

    # Create Time Series collection if it doesn't exist
    try:
        collections = await mongodb.db.list_collection_names()
        if "price_history" not in collections:
            await mongodb.db.create_collection(
                "price_history",
                timeseries={
                    "timeField": "recorded_at",
                    "metaField": "metadata",
                    "granularity": "hours",
                },
            )
            print("Time Series collection 'price_history' created.")
        else:
            print("Time Series collection 'price_history' already exists.")
    except Exception as e:
        print(f"Error initializing MongoDB Time Series: {e}")


async def close_mongo_connection():
    if mongodb.client is not None:
        mongodb.client.close()
        print("Closed MongoDB connection.")


def get_mongo_db():
    """Returns the MongoDB database instance for dependency injection"""
    return mongodb.db
