from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time

from .config import settings
from .database import engine, Base
from .routers.symptom import router as symptom_router

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs on startup and shutdown.
    """
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.warning(f"Could not create database tables: {e}")
    
    yield
    
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    description="""
    AI-Powered Symptom Checker Service for the Healthcare Platform.
    
    This service provides intelligent symptom analysis using OpenAI's GPT models,
    featuring:
    
    - **Symptom Analysis**: Submit symptoms and receive AI-powered analysis with possible conditions
    - **Emergency Detection**: Automatic detection of symptoms that may indicate medical emergencies
    - **Triage Assessment**: Priority-based triage recommendations (1-Critical to 5-Routine)
    - **Specialty Recommendations**: Guidance on which medical specialty to consult
    - **Follow-up Questions**: Context-aware questions to refine the analysis
    - **History Tracking**: Patient symptom history for pattern recognition
    
    ## Important Disclaimer
    
    This service is for informational purposes only and should NOT replace professional
    medical advice, diagnosis, or treatment. Always seek the advice of your physician
    or other qualified health provider with any questions you may have regarding a
    medical condition.
    """,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    logger.debug(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.debug(f"{request.method} {request.url.path} - {response.status_code}")
    return response


app.include_router(symptom_router)


@app.get("/", tags=["health"])
async def root():
    """Root endpoint - service information."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "documentation": "/docs"
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint for container orchestration.
    Returns the health status of the service and its dependencies.
    """
    health_status = {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": {
            "database": "unknown",
            "redis": "unknown",
            "openai": "unknown"
        }
    }
    
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    try:
        from .database import cache
        if cache.client.ping():
            health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    if settings.OPENAI_API_KEY:
        health_status["checks"]["openai"] = "configured"
    else:
        health_status["checks"]["openai"] = "not configured (using fallback)"
    
    return health_status


@app.get("/health/live", tags=["health"])
async def liveness_probe():
    """Kubernetes liveness probe endpoint."""
    return {"status": "alive"}


@app.get("/health/ready", tags=["health"])
async def readiness_probe():
    """Kubernetes readiness probe endpoint."""
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "not ready", "reason": "database unavailable"}
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "status_code": 500
        }
    )
