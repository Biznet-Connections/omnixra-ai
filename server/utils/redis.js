import { Redis } from "@upstash/redis";

let redis = null;
let redisDisabled = false;

export function getRedis() {
  if (redisDisabled) return null;
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("Redis env vars missing - cache disabled");
    redisDisabled = true;
    return null;
  }

  try {
    redis = new Redis({ url, token });
    console.log("Redis client initialized (Cape Town, af-south-1)");
    return redis;
  } catch (err) {
    console.error("Redis init failed:", err.message);
    redisDisabled = true;
    return null;
  }
}

export async function cacheGet(key) {
  const r = getRedis();
  if (!r) return null;
  try {
    const val = await r.get(key);
    return val;
  } catch (err) {
    console.warn("Redis GET failed:", err.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  const r = getRedis();
  if (!r) return false;
  try {
    await r.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (err) {
    console.warn("Redis SET failed:", err.message);
    return false;
  }
}

export async function cacheDel(patterns) {
  const r = getRedis();
  if (!r) return false;
  try {
    const keys = Array.isArray(patterns) ? patterns : [patterns];
    if (keys.length === 0) return false;
    await r.del(...keys);
    return true;
  } catch (err) {
    console.warn("Redis DEL failed:", err.message);
    return false;
  }
}

// Invalidate by prefix - scans and deletes matching keys
// Use sparingly - SCAN is O(N). Fine for small key counts.
export async function cacheInvalidatePrefix(prefix) {
  const r = getRedis();
  if (!r) return false;
  try {
    let cursor = 0;
    let deleted = 0;
    do {
      const result = await r.scan(cursor, { match: prefix + "*", count: 100 });
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await r.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== 0);
    if (deleted > 0) console.log("Cache invalidated:", deleted, "keys with prefix", prefix);
    return true;
  } catch (err) {
    console.warn("Redis SCAN+DEL failed:", err.message);
    return false;
  }
}

export function isRedisEnabled() {
  return getRedis() !== null;
}
