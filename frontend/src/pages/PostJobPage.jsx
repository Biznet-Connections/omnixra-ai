import React, { useState } from "react";
import { ArrowLeft, Sparkles, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import SuccessModal from "../components/SuccessModal";
import AIMatchingModal from "../components/AIMatchingModal";
import PaymentModal from "../components/PaymentModal";

const CATEGORIES = [
  "General", "IT", "Accounting", "Finance", "Sales", "Marketing",
  "Customer Service", "Administration", "Education", "Healthcare",
  "Construction", "Manufacturing", "Hospitality", "Retail",
  "Transport", "Security", "Agriculture", "Mining",
];

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Attachment"];

export default function PostJobPage({ setPage }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "",
    category: "General",
    location: user?.location || "",
    salary: "",
    type: "Full-time",
    description: "",
    requirements: "",
    deadline: "",
    applicationUrl: "",
  });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [posted, setPosted] = useState(false);
  const [postedJob, setPostedJob] = useState(null);
  const [showAIMatch, setShowAIMatch] = useState(false);
  const [showPayment, setShowPayment] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError("");
    if (!form.title.trim()) return setError("Job title is required");
    if (!form.location.trim()) return setError("Location is required");
    if (!form.description.trim()) return setError("Description is required");

    setPosting(true);
    try {
      const res = await api.post("/jobs/post", form);
      setPostedJob(res.data.job);
      setPosted(true);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setPosting(false);
    }
  };

  if (posted) {
    return (
      <>
        <SuccessModal
          title="Your job is live!"
          message={`"${postedJob?.title}" is now visible to jobseekers. Want us to find the best candidates for you?`}
          primaryLabel="🤖 Find top 10 candidates — $5"
          onPrimary={() => setShowAIMatch(true)}
          secondaryLabel="Manage my jobs"
          onSecondary={() => setPage("my-posts")}
          onClose={() => setPage("home")}
        />
        {showAIMatch && postedJob && (
          <AIMatchingModal
            job={postedJob}
            onClose={() => { setShowAIMatch(false); setPage("my-posts"); }}
            setPage={setPage}
            onPurchaseCredit={(type) => { setShowAIMatch(false); setShowPayment(type); }}
          />
        )}
        {showPayment && (
          <PaymentModal
            planKey={showPayment}
            onClose={() => setShowPayment(null)}
            onSuccess={() => { setShowPayment(null); setShowAIMatch(true); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2 mb-1">
          <h1 className="page-title">Post a Job</h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">FREE</span>
        </div>
        <p className="page-subtitle">Reach thousands of jobseekers across Zimbabwe.</p>

        <div className="space-y-4 mt-7">
          <div>
            <label className="form-label">Job Title *</label>
            <input name="title" value={form.title} onChange={handleChange} className="form-input" placeholder="e.g. Junior Developer" />
          </div>

          <div>
            <label className="form-label">Category *</label>
            <select name="category" value={form.category} onChange={handleChange} className="form-input">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Location *</label>
            <input name="location" value={form.location} onChange={handleChange} className="form-input" placeholder="e.g. Harare, Zimbabwe" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="form-input">
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Salary (optional)</label>
              <input name="salary" value={form.salary} onChange={handleChange} className="form-input" placeholder="e.g. $800/mo" />
            </div>
          </div>

          <div>
            <label className="form-label">Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="form-textarea" rows={5} placeholder="Describe the role, responsibilities, and what success looks like..." />
          </div>

          <div>
            <label className="form-label">Requirements (optional)</label>
            <textarea name="requirements" value={form.requirements} onChange={handleChange} className="form-textarea" rows={4} placeholder="Education, experience, certifications..." />
          </div>

          <div>
            <label className="form-label">Application Deadline (optional)</label>
            <input type="date" name="deadline" value={form.deadline} onChange={handleChange} className="form-input" />
          </div>

          <div>
            <label className="form-label">External Application URL (optional)</label>
            <input name="applicationUrl" value={form.applicationUrl} onChange={handleChange} className="form-input" placeholder="https://" />
            <p className="text-[10px] text-slate-500 mt-1">If set, applicants will be redirected to this URL instead of applying here.</p>
          </div>

          {error && <div className="text-xs text-red-400">{error}</div>}

          <button onClick={handleSubmit} disabled={posting} className="primary-button w-full">
            {posting ? "Publishing..." : "Publish Job"}
            {!posting && <CheckCircle size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
