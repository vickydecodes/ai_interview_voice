import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None


db_instance = Database()


async def connect_to_mongo():
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        # Ping database to verify connection
        await db_instance.client.admin.command('ping')
        logger.info(f"Connected successfully to MongoDB database: {settings.DATABASE_NAME}")

        # Create indexes
        await db_instance.db.users.create_index("email", unique=True)
        await db_instance.db.resumes.create_index("user_id")
        await db_instance.db.companies.create_index("tier")
        await db_instance.db.companies.create_index("company_id", unique=True)
        await db_instance.db.unlock_status.create_index([("user_id", 1), ("company_id", 1)], unique=True)
        await db_instance.db.interviews.create_index("user_id")
        await db_instance.db.reports.create_index("interview_id", unique=True)
        await db_instance.db.recommendations_cache.create_index([("company_id", 1), ("skill_name", 1)], unique=True)
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise e


async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    return db_instance.db


# Convenience accessors for collections
def get_users_collection():
    return db_instance.db["users"]


def get_resumes_collection():
    return db_instance.db["resumes"]


def get_companies_collection():
    return db_instance.db["companies"]


def get_unlock_status_collection():
    return db_instance.db["unlock_status"]


def get_interviews_collection():
    return db_instance.db["interviews"]


def get_reports_collection():
    return db_instance.db["reports"]


def get_recommendations_cache_collection():
    return db_instance.db["recommendations_cache"]
