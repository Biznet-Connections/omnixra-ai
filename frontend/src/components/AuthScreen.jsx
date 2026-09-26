import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Mail, Lock, Building2, User, ArrowRight, ArrowLeft, Search, Check, Loader2, Briefcase, MapPin, BadgeCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Capacitor } from "@capacitor/core";
import api from "../api/axios";
import ForgotPasswordFlow from "../pages/ForgotPasswordFlow";
import { useNotifications } from "../context/NotificationContext";
import LocationAutocomplete from "./LocationAutocomplete";

// Map known industries → safe emoji (no variation selectors)
const SAFE_EMOJI_MAP = {
  "information technology": "💻",
  "it": "💻",
  "software": "💻",
  "finance & accounting": "💰",
  "finance": "💰",
  "accounting": "💰",
  "healthcare": "🏥",
  "health": "🏥",
  "nursing": "🏥",
  "education": "📚",
  "teaching": "📚",
  "construction": "🏗",
  "building": "🏗",
  "driving": "🚗",
  "transport": "🚗",
  "sales & marketing": "📈",
  "sales": "📈",
  "marketing": "📈",
  "culinary arts": "🍳",
  "culinary": "🍳",
  "hospitality": "🍽",
  "engineering": "⚙",
  "mining": "⛏",
  "agriculture": "🌾",
  "retail": "🛒",
  "admin": "📋",
  "hr": "👥",
  "security": "🛡",
  "legal": "⚖",
  "logistics": "📦",
  "cleaning": "🧹",
  "customer service": "🎧",
};

function safeEmojiFor(name) {
  if (!name) return "•";
  const key = String(name).toLowerCase().trim();
  if (SAFE_EMOJI_MAP[key]) return SAFE_EMOJI_MAP[key];
  // Try partial match
  for (const k of Object.keys(SAFE_EMOJI_MAP)) {
    if (key.includes(k) || k.includes(key)) return SAFE_EMOJI_MAP[k];
  }
  return "•";
}

const POPULAR_INDUSTRIES = [
  { name: "Information Technology", emoji: "💻" },
  { name: "Finance & Accounting", emoji: "💰" },
  { name: "Healthcare", emoji: "🩺" },
  { name: "Education", emoji: "📚" },
  { name: "Construction", emoji: "🏗️" },
  { name: "Driving", emoji: "🚗" },
  { name: "Sales & Marketing", emoji: "📈" },
  { name: "Culinary Arts", emoji: "🍳" },
];

// ── Validation helpers ──
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
const isValidPassword = (p) => (p || "").length >= 8 && /\d/.test(p) && /[a-zA-Z]/.test(p);
const isValidName = (n) => (n || "").trim().length >= 2;

function AuthScreen({ initialMode = "signup" }) {
  const [mode, setMode] = useState(initialMode || "signup");
  const [step, setStep] = useState(1);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [accountType, setAccountType] = useState("jobseeker");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    password: "",
    category: "",
    country: "",
    city: "",
    discoverable: false,
    jobAlerts: false,
  });

  const [error, setError] = useState("");
  const [cityPicked, setCityPicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Industry search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [searching, setSearching] = useState(false);

  // Auto-advance timer + suppression flag
  const autoAdvanceRef = useRef(null);
  const [suppressAutoAdvance, setSuppressAutoAdvance] = useState(false);
  const scrollRef = useRef(null);
  const stepRef = useRef(step);
  const modeRef = useRef(mode);

  // Keep refs in sync (needed for Capacitor back listener)
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Android hardware back button handler ──
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listener;
    (async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");
        listener = await CapApp.addListener("backButton", ({ canGoBack }) => {
          // Signup wizard: on step >1, back goes to previous step. Step 1 → exit.
          if (modeRef.current === "signup" && stepRef.current > 1) {
            setSuppressAutoAdvance(true);
            setStep((s) => Math.max(1, s - 1));
            setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 40);
            return;
          }
          // Otherwise, let default back behavior happen
          if (canGoBack) window.history.back();
          else CapApp.exitApp();
        });
      } catch (e) {
        console.warn("[back] listener failed:", e.message);
      }
    })();
    return () => { if (listener) listener.remove(); };
  }, []);

  const { signup, signin } = useAuth();
  const { requestPermission } = useNotifications();

  // ── Step validity ──
  const step1Valid = (() => {
    if (accountType === "company") {
      return isValidName(formData.companyName) && isValidEmail(formData.email) && isValidPassword(formData.password);
    }
    return isValidName(formData.firstName) && isValidName(formData.lastName) && isValidEmail(formData.email) && isValidPassword(formData.password);
  })();

  const step2Valid = !!(formData.category && formData.country && cityPicked);
  const step3Valid = formData.discoverable; // must check "I agree"

  // ── Auto-advance logic ──
  useEffect(() => {
    if (mode !== "signup") return;
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);

    // Don't auto-advance right after user tapped Back
    if (suppressAutoAdvance) return;

    const canAdvance =
      (step === 1 && step1Valid) ||
      (step === 2 && step2Valid);

    if (canAdvance) {
      autoAdvanceRef.current = setTimeout(() => {
        setStep((s) => (s < 3 ? s + 1 : s));
        // Scroll to top of the wizard
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }, 40);
      }, 1200);
    }

    return () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); };
  }, [step, step1Valid, step2Valid, mode, suppressAutoAdvance]);

  // ── Industry search ──
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIndustries([]);
      setShowSuggestions(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.post("/ai/industries", { query: searchQuery });
        setIndustries(res.data.industries || []);
        setShowSuggestions(true);
      } catch { /* silent */ } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleChange = (e) => {
    setSuppressAutoAdvance(false);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectIndustry = (name) => {
    setSuppressAutoAdvance(false);
    setFormData({ ...formData, category: name });
    setSearchQuery(name);
    setShowSuggestions(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setStep(1);
    setSuppressAutoAdvance(false);
    setError("");
    autoAdvanceRef.current = null;
  };

  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const goBack = () => {
    setSuppressAutoAdvance(true);
    setStep((s) => Math.max(s - 1, 1));
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 40);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!step3Valid) {
          setError("Please agree to be discovered to continue");
          setLoading(false);
          return;
        }
        const name = accountType === "company"
          ? formData.companyName
          : `${formData.firstName} ${formData.lastName}`.trim();
        const location = `${formData.city}, ${formData.country}`;

        await signup({
          name,
          email: formData.email,
          password: formData.password,
          accountType,
          companyName: accountType === "company" ? formData.companyName : undefined,
          location,
          country: formData.country,
          city: formData.city,
          category: formData.category || "General",
          discoverable: formData.discoverable,
          jobAlerts: formData.jobAlerts,
        });

        try { requestPermission?.().catch(() => {}); } catch {}

        // Show success screen, then AuthContext will redirect
        setSuccess(true);
      } else {
        await signin({ email: formData.email, password: formData.password });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (forgotPassword) {
    return <ForgotPasswordFlow onClose={() => setForgotPassword(false)} />;
  }

  // ── Success screen ──
  if (success) {
    return (
      <div className="auth-wizard" ref={scrollRef}>
        <div className="auth-success-screen">
          <div className="auth-success-orb">✓</div>
          <h2 className="auth-wizard-title">Welcome, {formData.firstName || formData.companyName || "friend"}! 🎉</h2>
          <p className="auth-wizard-sub">Setting up your profile…</p>
          <div style={{ marginTop: 20 }}>
            <div className="btn-loading">
              <span className="btn-loading-dot" />
              <span className="btn-loading-dot" />
              <span className="btn-loading-dot" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //   SIGN IN — single step
  // ═══════════════════════════════════════════════
  if (mode === "signin") {
    return (
      <div className="auth-wizard" ref={scrollRef}>
        <div className="auth-wizard-inner">
          <div className="auth-header" style={{ marginBottom: 24 }}>
            <div className="flex items-center gap-3 justify-center">
              <div className="logo-orb"><Sparkles size={21} strokeWidth={2.2} /></div>
              <div className="text-left">
                <div className="text-[19px] font-bold tracking-tight">omnixra<span className="text-indigo-400">-AI</span></div>
                <div className="text-[8px] text-slate-600 tracking-[.18em]">EMPLOYMENT INTELLIGENCE</div>
              </div>
            </div>
          </div>

          <div className="auth-card">
            <div className="auth-tabs">
              <button type="button" onClick={() => switchMode("signup")} className="auth-tab">Create account</button>
              <button type="button" onClick={() => switchMode("signin")} className="auth-tab auth-tab-active">Sign in</button>
            </div>

            <div className="auth-tab-content">
              <h1 className="auth-title">Welcome back 👋</h1>
              <p className="auth-subtitle">Your career intelligence is waiting.</p>
            </div>

            <div className="auth-field mt-4">
              <label className="auth-field-label">Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>

            <div className="auth-field">
              <label className="auth-field-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, color: "#64748b", fontSize: 11, cursor: "pointer" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button type="button" onClick={() => setForgotPassword(true)} style={{ background: "transparent", border: 0, color: "#818cf8", fontSize: 11.5, cursor: "pointer" }}>
                Forgot password?
              </button>
            </div>

            {error && <div className="auth-error-banner mt-4">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={loading || !isValidEmail(formData.email) || !formData.password}
              className="auth-wizard-next w-full"
              style={{ marginTop: 20 }}
            >
              {loading ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  //   SIGN UP — 3-step wizard
  // ═══════════════════════════════════════════════
  return (
    <div className="auth-wizard" ref={scrollRef}>
      <div className="auth-wizard-inner">

        {/* Header */}
        <div className="auth-header" style={{ marginBottom: 18 }}>
          <div className="flex items-center gap-3 justify-center">
            <div className="logo-orb"><Sparkles size={21} strokeWidth={2.2} /></div>
            <div className="text-left">
              <div className="text-[19px] font-bold tracking-tight">omnixra<span className="text-indigo-400">-AI</span></div>
              <div className="text-[8px] text-slate-600 tracking-[.18em]">EMPLOYMENT INTELLIGENCE</div>
            </div>
          </div>
        </div>

        {/* Step bar */}
        <div className="auth-step-bar">
          <div className={`auth-step-dot ${step >= 1 ? "done" : ""} ${step === 1 ? "current active" : ""}`} />
          <div className={`auth-step-dot ${step >= 2 ? "done" : ""} ${step === 2 ? "current active" : ""}`} />
          <div className={`auth-step-dot ${step >= 3 ? "done" : ""} ${step === 3 ? "current active" : ""}`} />
        </div>
        <div className="auth-step-label">Step {step} of 3</div>

        {/* Tab switcher (compact) */}
        <div className="auth-tabs" style={{ marginTop: 12 }}>
          <button type="button" onClick={() => switchMode("signup")} className="auth-tab auth-tab-active">Create account</button>
          <button type="button" onClick={() => switchMode("signin")} className="auth-tab">Sign in</button>
        </div>

        {/* ══ STEP 1 — Identity ══ */}
        {step === 1 && (
          <div className="auth-step-content">
            <h1 className="auth-wizard-title">Welcome to Omnixra 👋</h1>
            <p className="auth-wizard-sub">Let's get you set up</p>

            <div className="auth-field" style={{ marginBottom: 16 }}>
              <label className="auth-field-label">I'm joining as</label>
              <div className="auth-role-row">
                <button
                  type="button"
                  onClick={() => setAccountType("jobseeker")}
                  className={`auth-role-btn ${accountType === "jobseeker" ? "active" : ""}`}
                >
                  <span className="auth-role-emoji">👤</span>
                  <span className="auth-role-name">Job Seeker</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("company")}
                  className={`auth-role-btn ${accountType === "company" ? "active" : ""}`}
                >
                  <span className="auth-role-emoji">🏢</span>
                  <span className="auth-role-name">Company</span>
                </button>
              </div>
            </div>

            {accountType === "jobseeker" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="auth-field">
                  <label className="auth-field-label">First name</label>
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    autoCapitalize="words"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                  />
                  {formData.firstName && isValidName(formData.firstName) && (
                    <div className="auth-field-check"><Check size={11} /> Looks good</div>
                  )}
                </div>
                <div className="auth-field">
                  <label className="auth-field-label">Last name</label>
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    autoCapitalize="words"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                  />
                  {formData.lastName && isValidName(formData.lastName) && (
                    <div className="auth-field-check"><Check size={11} /> Looks good</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="auth-field">
                <label className="auth-field-label">Company name</label>
                <input
                  name="companyName"
                  autoComplete="organization"
                  autoCapitalize="words"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g. First Mutual Holdings"
                />
              </div>
            )}

            <div className="auth-field">
              <label className="auth-field-label">Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
              {formData.email && isValidEmail(formData.email) && (
                <div className="auth-field-check"><Check size={11} /> Valid email</div>
              )}
              {formData.email && !isValidEmail(formData.email) && (
                <div className="auth-field-error">Enter a valid email address</div>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-field-label">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, color: "#64748b", fontSize: 11, cursor: "pointer" }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {formData.password && isValidPassword(formData.password) && (
                <div className="auth-field-check"><Check size={11} /> 8+ characters, 1 number, 1 letter</div>
              )}
              {formData.password && !isValidPassword(formData.password) && (
                <div className="auth-field-error">Needs 8+ chars, 1 number, 1 letter</div>
              )}
            </div>

            {step1Valid && !suppressAutoAdvance && (
              <div className="auth-auto-continue">
                <Check size={14} /> All set — continuing…
              </div>
            )}

            {/* When user came back from Step 2, show a Continue button */}
            {suppressAutoAdvance && step1Valid && (
              <div className="auth-wizard-actions">
                <button
                  type="button"
                  onClick={() => { setSuppressAutoAdvance(false); setStep(2); }}
                  className="auth-wizard-next"
                >
                  Continue <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 2 — Profile ══ */}
        {step === 2 && (
          <div className="auth-step-content">
            <h1 className="auth-wizard-title">Almost there 🎯</h1>
            <p className="auth-wizard-sub">Tell us what you do</p>

            {/* Industry search */}
            <div className="auth-field" style={{ position: "relative" }}>
              <label className="auth-field-label">Your industry <span className="auth-checkbox-req">*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  value={formData.category || searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setFormData({ ...formData, category: "" }); }}
                  onFocus={() => searchQuery && setShowSuggestions(true)}
                  placeholder="Type or search your industry..."
                  autoComplete="off"
                />
                {formData.category && (
                  <Check size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#22c55e" }} />
                )}
              </div>

              {showSuggestions && (
                <div className="loc-dropdown">
                  {searching ? (
                    <div className="loc-empty"><Loader2 size={14} className="animate-spin" /> Searching…</div>
                  ) : industries.length > 0 ? (
                    <>
                      <div style={{ fontSize: 10.5, color: "#64748b", padding: "6px 10px 4px", textTransform: "uppercase", letterSpacing: 1 }}>Did you mean</div>
                      {industries.map((ind, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectIndustry(ind.name)}
                          className="loc-option"
                        >
                          <span>{safeEmojiFor(ind.name)}</span>
                          <span className="loc-option-label">{ind.name}</span>
                        </button>
                      ))}
                      <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", margin: "4px 0" }} />
                      <button type="button" onClick={() => selectIndustry(searchQuery)} className="loc-option">
                        <span>➕</span>
                        <span className="loc-option-label">Use "{searchQuery}"</span>
                      </button>
                    </>
                  ) : searchQuery.trim().length >= 2 ? (
                    <button type="button" onClick={() => selectIndustry(searchQuery)} className="loc-option">
                      <span>➕</span>
                      <span className="loc-option-label">Use "{searchQuery}"</span>
                    </button>
                  ) : (
                    <div className="loc-empty">Type at least 2 characters…</div>
                  )}
                </div>
              )}

              {!searchQuery && !formData.category && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Popular</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {POPULAR_INDUSTRIES.map((ind, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectIndustry(ind.name)}
                        className="industry-chip"
                      >
                        {safeEmojiFor(ind.name)} {ind.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-field-label">Country <span className="auth-checkbox-req">*</span></label>
              <LocationAutocomplete
                mode="country"
                value={formData.country}
                onChange={(v) => setFormData((f) => ({ ...f, country: v }))}
                onSelect={(item) => { setSuppressAutoAdvance(false); setFormData((f) => ({ ...f, country: item.label })); }}
                placeholder="Type a country..."
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-field-label">City / Province <span className="auth-checkbox-req">*</span></label>
              <LocationAutocomplete
                mode="city"
                value={formData.city}
                onChange={(v) => { setCityPicked(false); setFormData((f) => ({ ...f, city: v })); }}
                onSelect={(item) => { setSuppressAutoAdvance(false); setCityPicked(true); setFormData((f) => ({ ...f, city: item.name, country: item.country || f.country })); }}
                placeholder="e.g. Harare, Bulawayo, London..."
                required
              />
            </div>

            {step2Valid && (
              <div className="auth-auto-continue">
                <Check size={14} /> All set — continuing…
              </div>
            )}

            <div className="auth-wizard-actions">
              <button type="button" onClick={goBack} className="auth-wizard-back">
                <ArrowLeft size={14} /> Back
              </button>
              <button type="button" onClick={goNext} disabled={!step2Valid} className="auth-wizard-next">
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 — Confirm ══ */}
        {step === 3 && (
          <div className="auth-step-content">
            <h1 className="auth-wizard-title">One last thing ✨</h1>
            <p className="auth-wizard-sub">Review and create your account</p>

            <div className="auth-review-card">
              <div className="auth-review-name">
                {accountType === "company" ? formData.companyName : `${formData.firstName} ${formData.lastName}`}
              </div>
              <div className="auth-review-row">
                <Mail size={12} /> {formData.email}
              </div>
              <div className="auth-review-row">
                <Briefcase size={12} /> {formData.category}
              </div>
              <div className="auth-review-row">
                <MapPin size={12} /> {formData.city}, {formData.country}
              </div>
              <button type="button" onClick={() => setStep(1)} className="auth-review-edit">
                Edit
              </button>
            </div>

            <label className="auth-checkbox-row">
              <input
                type="checkbox"
                checked={formData.discoverable}
                onChange={(e) => setFormData({ ...formData, discoverable: e.target.checked })}
              />
              <span className="auth-checkbox-text">
                I agree to be discovered by companies and recruiters <span className="auth-checkbox-req">*</span>
              </span>
            </label>

            <label className="auth-checkbox-row">
              <input
                type="checkbox"
                checked={formData.jobAlerts}
                onChange={(e) => setFormData({ ...formData, jobAlerts: e.target.checked })}
              />
              <span className="auth-checkbox-text">
                Send me job alerts for my industry (optional)
              </span>
            </label>

            {error && <div className="auth-error-banner">{error}</div>}

            <div className="auth-wizard-actions">
              <button type="button" onClick={goBack} className="auth-wizard-back">
                <ArrowLeft size={14} /> Back
              </button>
              <button type="button" onClick={handleSubmit} disabled={loading || !step3Valid} className="auth-wizard-next">
                {loading ? (
                  <span className="btn-loading">
                    <span className="btn-loading-dot" />
                    <span className="btn-loading-dot" />
                    <span className="btn-loading-dot" />
                    <span className="btn-loading-text">Creating…</span>
                  </span>
                ) : (
                  <><BadgeCheck size={16} /> Create my account</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthScreen;
