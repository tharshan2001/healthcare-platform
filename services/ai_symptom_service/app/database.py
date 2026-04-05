from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import redis
from contextlib import contextmanager

from .config import settings

# SQLAlchemy Database Engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG
)

# Session Factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.
    Ensures proper cleanup after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database sessions.
    Useful for non-request contexts (background tasks, scripts).
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Redis Connection
def get_redis_client() -> redis.Redis:
    """
    Get Redis client instance.
    Returns a Redis connection for caching operations.
    """
    return redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )


class RedisCache:
    """Redis cache wrapper with common operations."""
    
    def __init__(self):
        self._client = None
    
    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = get_redis_client()
        return self._client
    
    def get(self, key: str) -> str | None:
        """Get value from cache."""
        try:
            return self.client.get(key)
        except redis.RedisError:
            return None
    
    def set(self, key: str, value: str, ttl: int = None) -> bool:
        """Set value in cache with optional TTL."""
        try:
            ttl = ttl or settings.REDIS_CACHE_TTL
            return self.client.setex(key, ttl, value)
        except redis.RedisError:
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            return bool(self.client.delete(key))
        except redis.RedisError:
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(self.client.exists(key))
        except redis.RedisError:
            return False


# Global cache instance
cache = RedisCache()


def init_db():
    """
    Initialize database tables.
    Should be called on application startup if not using migrations.
    """
    Base.metadata.create_all(bind=engine)
