import express from "express";
import axios from "axios";

const router = express.Router();

// In-memory cache (5 min TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ results: [] });

    const cached = cache.get(q.toLowerCase());
    if (cached && Date.now() - cached.t < CACHE_TTL) {
      return res.json({ results: cached.data });
    }

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`;
    const r = await axios.get(url, { timeout: 5000 });
    const features = r.data?.features || [];

    const results = features
      .map((f) => {
        const p = f.properties || {};
        const name = p.name || p.city || p.country || "";
        const country = p.country || "";
        const state = p.state || "";
        const type = p.type || "location";
        const parts = [name];
        if (state && state !== name && state !== country) parts.push(state);
        if (country) parts.push(country);
        return {
          name,
          country,
          state,
          label: parts.join(", "),
          type,
          lat: f.geometry?.coordinates?.[1],
          lng: f.geometry?.coordinates?.[0],
        };
      })
      .filter((r) => r.name);

    const seen = new Set();
    const unique = [];
    for (const r of results) {
      if (!seen.has(r.label)) { seen.add(r.label); unique.push(r); }
    }

    cache.set(q.toLowerCase(), { t: Date.now(), data: unique });
    res.json({ results: unique });
  } catch (e) {
    console.error("[locations]", e.message);
    res.json({ results: [] });
  }
});

export default router;
