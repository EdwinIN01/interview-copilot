from app.config import settings

_redis = None


async def get_redis():
    """获取 Redis 客户端（如果配置了的话）"""
    global _redis
    if not settings.REDIS_URL:
        return None
    if _redis is None:
        try:
            import redis.asyncio as aioredis
            _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception:
            _redis = None
    return _redis
