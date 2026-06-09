from typing import Annotated

from fastapi import Depends
from redis.asyncio import Redis

from app.infrastructure.cache.redis_client import get_redis
from app.modules.cart.service import CartService


async def get_cart_service(
    redis: Annotated[Redis, Depends(get_redis)],
) -> CartService:
    return CartService(redis)
