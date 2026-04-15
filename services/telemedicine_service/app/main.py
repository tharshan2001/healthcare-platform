import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .config import settings
from .database import Base, engine
from .routers.session import router as telemedicine_router

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _normalize_telemedicine_schema() -> None:
    """Ensure telemedicine participant ids use integer columns, rebuilding legacy UUID tables when needed."""
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = 'telemedicine_sessions' AND column_name = 'doctor_id'
                """
            )
        ).fetchone()

    if row and row[0] == "uuid":
        logger.warning("Detected legacy UUID telemedicine schema. Rebuilding telemedicine tables for integer ids.")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        logger.info("Telemedicine schema rebuilt successfully")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    try:
        Base.metadata.create_all(bind=engine)
        _normalize_telemedicine_schema()
        logger.info("Database tables created/verified")
    except Exception as exc:
        logger.warning("Could not create database tables: %s", exc)
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Telemedicine Service for doctor-patient video consultation workflows."
        " Supports session scheduling, participant join links/tokens,"
        " and lifecycle management."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(time.time() - start_time)
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug("%s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.debug("%s %s - %s", request.method, request.url.path, response.status_code)
    return response


app.include_router(telemedicine_router)


@app.get("/", tags=["health"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "documentation": "/docs",
    }


@app.get("/health", tags=["health"])
async def health_check():
    health_status = {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": {"database": "unknown", "video_provider": settings.VIDEO_PROVIDER},
    }

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as exc:
        health_status["checks"]["database"] = f"unhealthy: {str(exc)}"
        health_status["status"] = "degraded"

    return health_status


@app.get("/health/live", tags=["health"])
async def liveness_probe():
    return {"status": "alive"}


@app.get("/health/ready", tags=["health"])
async def readiness_probe():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "not ready", "reason": "database unavailable"},
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "status_code": 500,
        },
    )

