import React, { useEffect, useState, useRef, useCallback } from "react";
import CompanyCard from "../components/CompanyCard";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

let cachedCompanies = null;
let cachedCursor = null;
let cachedHasMore = true;

function CompaniesPage() {
  const [companies, setCompanies] = useState(cachedCompanies || []);
  const [loading, setLoading] = useState(!cachedCompanies);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(cachedHasMore);
  const cursorRef = useRef(cachedCursor);
  const hasMoreRef = useRef(cachedHasMore);
  const loadingRef = useRef(false);
  const sentinelRef = useRef(null);

  // ── Initial load ──
  useEffect(() => {
    if (cachedCompanies && cachedCompanies.length > 0) return;
    api.get("/companies?limit=20")
      .then(res => {
        const list = res.data.companies || [];
        cachedCompanies = list;
        cachedCursor = res.data.nextCursor || null;
        cachedHasMore = !!res.data.hasMore;
        cursorRef.current = cachedCursor;
        hasMoreRef.current = cachedHasMore;
        setCompanies(list);
        setHasMore(cachedHasMore);
      })
      .catch(err => console.error("Companies load error:", err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Load more ──
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const url = cursorRef.current
        ? `/companies?limit=20&cursor=${encodeURIComponent(cursorRef.current)}`
        : "/companies?limit=20";
      const res = await api.get(url);
      const list = res.data.companies || [];
      setCompanies(prev => {
        const existingIds = new Set(prev.map(c => c._id));
        const fresh = list.filter(c => !existingIds.has(c._id));
        const merged = [...prev, ...fresh];
        cachedCompanies = merged;
        return merged;
      });
      cursorRef.current = res.data.nextCursor || null;
      hasMoreRef.current = !!res.data.hasMore;
      cachedCursor = cursorRef.current;
      cachedHasMore = hasMoreRef.current;
      setHasMore(hasMoreRef.current);
    } catch (err) {
      console.error("Load more companies error:", err.message);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // ── Auto-load: fires on scroll in ANY container + window ──
  useEffect(() => {
    let sentinel = sentinelRef.current;
    let cleanup = null;
    let settled = false;

    const setup = (el) => {
      if (!el || cleanup || settled) return;
      settled = true;
      const scrollRoot = el.closest(".page-scroll");

      const checkAndLoad = () => {
        if (loadingRef.current || !hasMoreRef.current) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top < vh + 400 && rect.bottom > -400) {
          loadMore();
        }
      };

      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { checkAndLoad(); ticking = false; });
      };

      window.addEventListener("scroll", onScroll, { passive: true, capture: true });
      window.addEventListener("resize", onScroll);
      window.addEventListener("touchmove", onScroll, { passive: true });
      document.addEventListener("scroll", onScroll, { passive: true, capture: true });
      if (scrollRoot) scrollRoot.addEventListener("scroll", onScroll, { passive: true });

      const t1 = setTimeout(checkAndLoad, 200);
      const t2 = setTimeout(checkAndLoad, 800);
      const t3 = setTimeout(checkAndLoad, 2000);

      cleanup = () => {
        window.removeEventListener("scroll", onScroll, { capture: true });
        window.removeEventListener("resize", onScroll);
        window.removeEventListener("touchmove", onScroll);
        document.removeEventListener("scroll", onScroll, { capture: true });
        if (scrollRoot) scrollRoot.removeEventListener("scroll", onScroll);
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      };
    };

    if (sentinel) {
      setup(sentinel);
    } else {
      let tries = 0;
      const retry = () => {
        tries++;
        const el = sentinelRef.current;
        if (el) {
          setup(el);
        } else if (tries < 20) {
          setTimeout(retry, 200);
        } else {
        }
      };
      setTimeout(retry, 100);
    }

    return () => { if (cleanup) cleanup(); };
}, [loadMore, loading]);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Discover companies</h1>
        <p className="page-subtitle">Explore employers in Zimbabwe and beyond.</p>

        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : companies.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon">🏢</div>
            <h2 className="text-sm font-semibold mt-4">No companies yet</h2>
          </div>
        ) : (
          <>
            <div className="company-grid mt-7">
              {companies.map(company => (
                <CompanyCard key={company._id} company={company} />
              ))}
            </div>

            {/* Sentinel — triggers loadMore when scrolled near */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                {loadingMore && <LoadingDots />}
              </div>
            )}

            {!hasMore && companies.length > 0 && (
              <p className="text-center text-xs opacity-50 py-6">You've reached the end</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CompaniesPage;
