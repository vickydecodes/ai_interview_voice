import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, resume

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing LevelUp Interview API...")
    await connect_to_mongo()
    yield
    # Shutdown
    logger.info("Shutting down LevelUp Interview API...")
    await close_mongo_connection()


app = FastAPI(
    title="LevelUp Interview API",
    description="Backend API for LevelUp Interview: Resume parsing, company unlock engine, AI voice interview room, and feedback analytics.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router)
app.include_router(resume.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "LevelUp Interview API",
        "llm_provider": settings.LLM_PROVIDER,
        "stt_provider": settings.STT_PROVIDER,
        "tts_provider": settings.TTS_PROVIDER,
    }
