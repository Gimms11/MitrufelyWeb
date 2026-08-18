"""
Mifrufely Web — Resilient Redis / In-Memory Cache Client
Supports Redis in dev/container environment and graceful In-Memory fallback in serverless (Cloud Run).
"""

import time
from typing import Any
import structlog
from redis.asyncio import Redis, from_url
from redis.exceptions import ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError

from app.core.config import settings

logger = structlog.get_logger(__name__)


class InMemoryFallbackRedis:
    """In-memory key-value store implementing common Redis async operations."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}
        self._expirations: dict[str, float] = {}

    def _cleanup_key_if_expired(self, key: str) -> None:
        if key in self._expirations and time.time() > self._expirations[key]:
            self._store.pop(key, None)
            self._expirations.pop(key, None)

    async def get(self, key: str) -> Any:
        self._cleanup_key_if_expired(key)
        return self._store.get(key)

    async def set(self, key: str, value: Any, ex: int | None = None, **kwargs: Any) -> bool:
        self._store[key] = value
        if ex is not None:
            self._expirations[key] = time.time() + ex
        else:
            self._expirations.pop(key, None)
        return True

    async def setex(self, key: str, time_seconds: int, value: Any) -> bool:
        return await self.set(key, value, ex=time_seconds)

    async def exists(self, *keys: str) -> int:
        count = 0
        for k in keys:
            self._cleanup_key_if_expired(k)
            if k in self._store:
                count += 1
        return count

    async def delete(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if k in self._store:
                self._store.pop(k, None)
                self._expirations.pop(k, None)
                count += 1
        return count

    async def incr(self, key: str, amount: int = 1) -> int:
        self._cleanup_key_if_expired(key)
        val = int(self._store.get(key, 0)) + amount
        self._store[key] = val
        return val

    async def expire(self, key: str, time_seconds: int) -> bool:
        if key in self._store:
            self._expirations[key] = time.time() + time_seconds
            return True
        return False

    async def ttl(self, key: str) -> int:
        self._cleanup_key_if_expired(key)
        if key not in self._store:
            return -2
        if key in self._expirations:
            remaining = int(self._expirations[key] - time.time())
            return max(0, remaining)
        return -1

    async def ping(self) -> bool:
        return True


class ResilientRedisClient:
    """Proxy around Redis that gracefully delegates to in-memory store if Redis is unavailable."""

    def __init__(self, redis_url: str) -> None:
        self._is_memory = redis_url.startswith("memory://") or (
            settings.APP_ENV == "production" and "redis:6399" in redis_url
        )
        self._memory = InMemoryFallbackRedis()
        self._redis: Redis | None = None
        if not self._is_memory:
            try:
                self._redis = from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                    socket_timeout=2.0,
                )
            except Exception as exc:
                logger.warning("cache.redis.init_failed_falling_back_to_memory", error=str(exc))
                self._is_memory = True

    async def _safe_execute(self, method_name: str, *args: Any, **kwargs: Any) -> Any:
        if not self._is_memory and self._redis:
            try:
                method = getattr(self._redis, method_name)
                return await method(*args, **kwargs)
            except (RedisConnectionError, RedisTimeoutError, OSError) as exc:
                logger.warning("cache.redis.error_fallback_to_memory", op=method_name, error=str(exc))
                self._is_memory = True
        method = getattr(self._memory, method_name)
        return await method(*args, **kwargs)

    async def get(self, key: str) -> Any:
        return await self._safe_execute("get", key)

    async def set(self, key: str, value: Any, ex: int | None = None, **kwargs: Any) -> bool:
        return await self._safe_execute("set", key, value, ex=ex, **kwargs)

    async def setex(self, key: str, time_seconds: int, value: Any) -> bool:
        return await self._safe_execute("setex", key, time_seconds, value)

    async def exists(self, *keys: str) -> int:
        return await self._safe_execute("exists", *keys)

    async def delete(self, *keys: str) -> int:
        return await self._safe_execute("delete", *keys)

    async def incr(self, key: str, amount: int = 1) -> int:
        return await self._safe_execute("incr", key, amount=amount)

    async def expire(self, key: str, time_seconds: int) -> bool:
        return await self._safe_execute("expire", key, time_seconds=time_seconds)

    async def ttl(self, key: str) -> int:
        return await self._safe_execute("ttl", key)

    async def ping(self) -> bool:
        return await self._safe_execute("ping")


redis_client: ResilientRedisClient = ResilientRedisClient(settings.REDIS_URL)


async def get_redis() -> ResilientRedisClient:
    """FastAPI dependency for Redis / Cache client."""
    return redis_client
