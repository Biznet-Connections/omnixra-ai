import React, { useState } from "react";
import { Sparkles, Mail, Lock, MapPin, Building2, User, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const categories = [
  "Information Technology",
  "Finance & Accounting",
  "Marketing & Sales",
  "Healthcare",
  "Education",
  "Engineering",
  "Plumbing",
  "Electrical",
  "Welding & Fabrication",
  "Mechanics",
  "Carpentry",
  "Housekeeping",
  "Gardening",
  "Nanny / Childcare",
  "Driving",
  "Security",
  "Farm Work",
  "Construction Labour",
  "General"
];

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [accountType, setAccountType] = useState("jobseeker");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyName: "",
    location: "",
    category: "General",
    discoverable: true
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const { signup, signin } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const name = accountType === "company"
          ? formData.companyName
          : `${formData.firstName} ${formData.lastName}`.trim();

        await signup({
          name,
          email: formData.email,
          password: formData.password,
          accountType,
          companyName: accountType === "company" ? formData.companyName : undefined,
          location: formData.location,
          category: formData.category,
          discoverable: formData.discoverable
        });
      } else {
        await signin({
          email: formData.email,
          password: formData.password
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch (err) {
      setError("Unable to process request");
    } finally {
      setLoading(false);
    }
  };

  if (forgotPassword) {
    return (
      <div className="min-h-screen auth-background flex items-center justify-center p-4">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <div className="w-full max-w-md relative z-10">
          <div className="auth-card">
            <button onClick={() => setForgotPassword(false)} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
              <ArrowLeft size={16} />
              Back to Sign in
            </button>
            <h1 className="text-2xl font-bold">Forgot Password</h1>
            <p className="text-xs text-slate-500 mt-2">Enter your email and we'll help you reset it.</p>
            {forgotSent ? (
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                If that email exists, a reset link has been sent.
              </div>
            ) : (
              <>
                <div className="mt-5">
                  <label className="form-label">Email address</label>
                  <div className="form-field">
                    <Mail size={16} className="input-icon" />
                    <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="form-input has-icon" placeholder="" />
                  </div>
                </div>
                <button onClick={handleForgotPassword} disabled={loading} className="primary-button w-full mt-5">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen auth-background flex items-center justify-center p-4">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <div className="w-full max-w-md relative z-10">
        <div className="auth-header">
          <div className="flex items-center gap-3 justify-center">
            <div className="logo-orb">
              <Sparkles size={21} strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <div className="text-[19px] font-bold tracking-tight">
                omnixra<span className="text-indigo-400">-AI</span>
              </div>
              <div className="text-[8px] text-slate-600 tracking-[.18em]">
                EMPLOYMENT INTELLIGENCE
              </div>
            </div>
          </div>

          <div className="auth-badge">
            <Sparkles size={12} />
            AI-powered employment network
          </div>

          <div>
            <h1 className="auth-title">
              {mode === "signup" ? "Welcome to Omnixra" : "Welcome back"}
            </h1>
            <p className="auth-subtitle">
              {mode === "signup"
                ? "Find opportunities. Discover talent. Grow."
                : "Your career intelligence is waiting."}
            </p>
          </div>
        </div>

        <div className="auth-card">
          {mode === "signup" && (
            <div className="mb-5">
              <div className="text-[11px] text-slate-500 mb-2">I am joining as</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAccountType("jobseeker")} className={`auth-choice ${accountType === "jobseeker" ? "auth-choice-active" : ""}`}>
                  <User size={16} />
                  <span>Job Seeker</span>
                </button>
                <button type="button" onClick={() => setAccountType("company")} className={`auth-choice ${accountType === "company" ? "auth-choice-active" : ""}`}>
                  <Building2 size={16} />
                  <span>Company</span>
                </button>
              </div>
            </div>
          )}

          {mode === "signup" && accountType === "jobseeker" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">First name</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange} className="form-input" placeholder="" />
              </div>
              <div>
                <label className="form-label">Last name</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange} className="form-input" placeholder="" />
              </div>
            </div>
          )}

          {mode === "signup" && accountType === "company" && (
            <div>
              <label className="form-label">Company name</label>
              <div className="form-field">
                <Building2 size={16} className="input-icon" />
                <input name="companyName" value={formData.companyName} onChange={handleChange} className="form-input has-icon" placeholder="" />
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="form-label">Email address</label>
            <div className="form-field">
              <Mail size={16} className="input-icon" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input has-icon" placeholder="" />
            </div>
          </div>

          <div className="mt-4">
            <label className="form-label">Password</label>
            <div className="form-field">
              <Lock size={16} className="input-icon" />
              <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="form-input has-icon has-right" placeholder="" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {mode === "signup" && accountType === "jobseeker" && (
            <div className="mt-4">
              <label className="form-label">Your Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="form-input">
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {mode === "signup" && (
            <div className="mt-4">
              <label className="form-label">Location</label>
              <div className="form-field">
                <MapPin size={16} className="input-icon" />
                <input name="location" value={formData.location} onChange={handleChange} className="form-input has-icon" placeholder="" />
              </div>
            </div>
          )}

          {mode === "signup" && accountType === "jobseeker" && (
            <div className="mt-4 flex items-center gap-2">
              <input type="checkbox" id="discoverable" checked={formData.discoverable} onChange={(e) => setFormData({ ...formData, discoverable: e.target.checked })} className="w-4 h-4 accent-indigo-500" />
              <label htmlFor="discoverable" className="text-xs text-slate-400">
                I agree to be discovered by companies
              </label>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="primary-button w-full mt-6 disabled:opacity-50">
            {loading ? "Please wait..." : mode === "signup" ? "Create my account" : "Sign in"}
            {!loading && <ArrowRight size={16} />}
          </button>

          {mode === "signin" && (
            <div className="text-center mt-4">
              <button onClick={() => setForgotPassword(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
                Forgot Password?
              </button>
            </div>
          )}

          <div className="text-center text-xs text-slate-600 mt-5">
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}
            <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="ml-1 text-indigo-400 hover:text-indigo-300">
              {mode === "signup" ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
