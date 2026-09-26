import React, { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import api from "../api/axios";
import { COUNTRIES } from "../utils/countries";

// Two modes:
//   mode="country" → only country suggestions
//   mode="city"    → city + country suggestions
export default function LocationAutocomplete({
  mode = "city",
  value = "",
  onChange,
  onSelect,
  placeholder = "Type to search...",
  required = false,
  error = "",
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);

  // Outside click closes
  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (mode === "country") {
          // Filter bundled list — instant
          const matched = COUNTRIES.filter((c) =>
            c.toLowerCase().startsWith(q.toLowerCase())
          ).slice(0, 8);
          setResults(matched.map((c) => ({ label: c, name: c, country: c, type: "country" })));
        } else {
          // Hit backend → Photon API
          const res = await api.get(`/locations/search?q=${encodeURIComponent(q)}`);
          const list = (res.data?.results || []).map((r) => ({
            label: r.label,
            name: r.name,
            country: r.country,
            state: r.state,
            type: r.type,
          }));
          setResults(list);
        }
        setOpen(true);
        setHighlight(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, mode]);

  const pick = (item) => {
    setQuery(item.label);
    setOpen(false);
    onChange && onChange(item.label);
    onSelect && onSelect(item);
  };

  const onKey = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(results[highlight]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="loc-autocomplete" ref={wrapRef}>
      <div className={`loc-input-wrap ${error ? "has-error" : ""}`}>
        {mode === "country" ? <MapPin size={14} className="loc-icon" /> : <Search size={14} className="loc-icon" />}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange && onChange(e.target.value); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="loc-input"
          autoComplete="off"
        />
        {loading && <Loader2 size={14} className="loc-spinner animate-spin" />}
        {required && <span className="loc-required">*</span>}
      </div>
      {error && <p className="loc-error">{error}</p>}

      {open && results.length > 0 && (
        <div className="loc-dropdown">
          {results.map((r, i) => (
            <button
              key={`${r.label}-${i}`}
              type="button"
              className={`loc-option ${i === highlight ? "active" : ""}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(r)}
            >
              <MapPin size={12} />
              <div className="loc-option-text">
                <div className="loc-option-label">{r.label}</div>
                {r.type && <div className="loc-option-type">{r.type}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.trim().length >= 2 && (
        <div className="loc-dropdown">
          <div className="loc-empty">No matches found</div>
        </div>
      )}
    </div>
  );
}
