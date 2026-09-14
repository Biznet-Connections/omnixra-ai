// Cache middleware - Redis-backed with in-memory fallback
// Preserves the same API: cacheShort(ttlSeconds, ...) and cacheLong(ttlSeconds, ...)
import { cacheGet, cacheSet, cacheDel, cacheInvalidatePrefix, isRedisEnabled } from "../utils/redis.js";

// In-memory fallback (used if Redis is down)
const memCache = new Map();
const MEM_MAX_KEYS = 200;

function memGet(key) {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    memCache.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key, value, ttlSeconds) {
  if (memCache.size >= MEM_MAX_KEYS) {
    // Evict oldest
    const firstKey = memCache.keys().next().value;
    memCache.delete(firstKey);
  }
  memCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

// Build cache key from request
function makeKey(req, prefix) {
  const url = req.originalUrl || req.url;
  return prefix + ":" + url;
}

// Core cache handler
function cacheMiddleware({ ttl, prefix, skipIf }) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    // Custom skip logic (e.g., authenticated users get fresh feed)
    if (typeof skipIf === "function" && skipIf(req)) return next();

    const key = makeKey(req, prefix || "cache");

    // Try Redis first
    if (isRedisEnabled()) {
      const cached = await cacheGet(key);
      if (cached !== null && cached !== undefined) {
        res.set("X-Cache", "HIT");
        return res.json(cached);
      }
    } else {
      // Fallback to memory
      const mem = memGet(key);
      if (mem) {
        res.set("X-Cache", "HIT-MEM");
        return res.json(mem);
      }
    }

    // Miss - capture the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (isRedisEnabled()) {
          cacheSet(key, body, ttl).catch(() => {});
        } else {
          memSet(key, body, ttl);
        }
      }
      res.set("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}

// Public API - same as before
export function cacheShort(ttlSeconds = 30, _unused = null) {
  return cacheMiddleware({ ttl: ttlSeconds, prefix: "short" });
}

export function cacheLong(ttlSeconds = 300, _unused = null) {
  return cacheMiddleware({ ttl: ttlSeconds, prefix: "long" });
}

// Invalidate all feed-related caches
export async function invalidateFeedCache() {
  // Redis: scan and delete
  if (isRedisEnabled()) {
    await cacheInvalidatePrefix("short:/api/posts");
    await cacheInvalidatePrefix("long:/api/posts");
  }
  // Memory: just clear it
  memCache.clear();
}

// Invalidate a specific post cache
export async function invalidatePostCache(postId) {
  if (!postId) return;
  if (isRedisEnabled()) {
    await cacheDel("short:/api/posts/" + postId);
    await cacheDel("long:/api/posts/" + postId);
  }
}

export default { cacheShort, cacheLong, invalidateFeedCache, invalidatePostCache };
