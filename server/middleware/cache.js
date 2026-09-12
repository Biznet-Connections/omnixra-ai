// server/middleware/cache.js
// Lightweight HTTP cache headers + ETag support for read-only GET routes.
// Behavior:
//   - Sets Cache-Control: public, max-age=30, stale-while-revalidate=60
//   - Computes a weak ETag from the response body
//   - If client sends If-None-Match matching the ETag → 304 Not Modified

import crypto from "crypto";

export function cacheShort(seconds = 30, swr = 60) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    // Bypass cache if user is authenticated and requesting fresh data
    // (comment out this block if you want caching for authed users too)
    // if (req.headers.authorization) return next();

    res.set("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${swr}`);

    // Intercept res.json to compute ETag from the body
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const json = JSON.stringify(body);
        const etag = `W/"${crypto.createHash("sha1").update(json).digest("hex").slice(0, 16)}"`;
        res.set("ETag", etag);

        // If client's cached ETag matches, reply 304 with no body
        const inm = req.headers["if-none-match"];
        if (inm && inm === etag) {
          return res.status(304).end();
        }
      } catch (e) {
        // If hashing fails for any reason, fall through to normal response
      }
      return originalJson(body);
    };

    next();
  };
}

// For content that rarely changes — much longer TTL
export function cacheLong(seconds = 300, swr = 600) {
  return cacheShort(seconds, swr);
}
