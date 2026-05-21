"""
Simple in-memory cache with TTL (time-to-live) support for API responses
"""
import time

class SimpleCache:
    """Simple in-memory cache with TTL (time-to-live) support"""
    def __init__(self):
        self._cache = {}
        self._ttl = {}
    
    def get(self, key: str, default=None):
        """Get value from cache if not expired"""
        if key in self._cache:
            if key in self._ttl and time.time() > self._ttl[key]:
                # Expired, remove it
                del self._cache[key]
                del self._ttl[key]
                return default
            return self._cache[key]
        return default
    
    def set(self, key: str, value, ttl_seconds: int = 300):
        """Set value in cache with TTL"""
        self._cache[key] = value
        self._ttl[key] = time.time() + ttl_seconds
    
    def clear(self, pattern: str = None):
        """Clear cache entries. If pattern provided, only clear matching keys"""
        if pattern:
            keys_to_remove = [k for k in self._cache.keys() if pattern in k]
            for key in keys_to_remove:
                self._cache.pop(key, None)
                self._ttl.pop(key, None)
        else:
            self._cache.clear()
            self._ttl.clear()
    
    def invalidate(self, key: str):
        """Invalidate a specific cache key"""
        self._cache.pop(key, None)
        self._ttl.pop(key, None)

# Global cache instance
cache = SimpleCache()

