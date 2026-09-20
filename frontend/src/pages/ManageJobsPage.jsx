import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Clock3, Pencil, Trash2, Pause, Play, Users, X, Loader2 } from "lucide-react";
import api from "../api/axios";

function ManageJobsPage({ setPage }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/jobs/mine/list");
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const toggleStatus = async (job) => {
    const next = job.status === "active" ? "paused" : "active";
    setBusyId(job._id);
    try {
      const res = await api.patch(`/jobs/${job._id}/status`, { status: next });
      setJobs(prev => prev.map(j => j._id === job._id ? { ...j, status: next, active: next === "active" } : j));
    } catch (e) {
      alert(e?.response?.data?.message || "Could not update status");
    } finally {
      setBusyId(null);
    }
  };

  const deleteJob = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    setBusyId(job._id);
    try {
      await api.delete(`/jobs/${job._id}`);
      setJobs(prev => prev.filter(j => j._id !== job._id));
    } catch (e) {
      alert(e?.response?.data?.message || "Could not delete job");
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async (form) => {
    setBusyId(editing._id);
    try {
      const res = await api.put(`/jobs/${editing._id}`, form);
      setJobs(prev => prev.map(j => j._id === editing._id ? { ...j, ...res.data.job } : j));
      setEditing(null);
    } catch (e) {
      alert(e?.response?.data?.message || "Could not save");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="page-title">Manage My Jobs</h1>
        <p className="page-subtitle">Edit, pause, or delete jobs you've posted.</p>

        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-indigo-400" /></div>
        ) : error ? (
          <div className="text-xs text-red-400 mt-6">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state mt-7">
            <h2 className="text-sm font-semibold">No jobs yet</h2>
            <p className="text-xs text-slate-500 mt-2">Post your first job to see it here.</p>
            <button onClick={() => setPage("post-job")} className="primary-button mt-4">Post a Job</button>
          </div>
        ) : (
          <div className="space-y-3 mt-7">
            {jobs.map(job => (
              <div key={job._id} className="job-card compact-card">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm truncate">{job.title}</div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${job.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                        {job.status?.toUpperCase() || "ACTIVE"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{job.company}</div>
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-600">
                      {job.location && <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>}
                      {job.createdAt && <span className="flex items-center gap-1"><Clock3 size={11} />{new Date(job.createdAt).toLocaleDateString()}</span>}
                      <span className="flex items-center gap-1"><Users size={11} />{job.applicantCount || 0} applicants</span>
                    </div>
                  </div>
                </div>
                <div className="card-actions mt-3">
                  <button onClick={() => setEditing(job)} className="outline-button" disabled={busyId === job._id}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => toggleStatus(job)} className="outline-button text-amber-400" disabled={busyId === job._id}>
                    {job.status === "active" ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
                  </button>
                  <button onClick={() => deleteJob(job)} className="outline-button text-red-400" disabled={busyId === job._id}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditJobModal
          job={editing}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          saving={busyId === editing._id}
        />
      )}
    </div>
  );
}

function EditJobModal({ job, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    title: job.title || "",
    location: job.location || "",
    salary: job.salary || "",
    category: job.category || "General",
    type: job.type || "Full-time",
    description: job.description || "",
    requirements: job.requirements || "",
    deadline: job.deadline ? job.deadline.slice(0, 10) : "",
    applicationUrl: job.applicationUrl || "",
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Edit Job</h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="form-label">Title</label>
            <input name="title" value={form.title} onChange={handle} className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Category</label>
              <input name="category" value={form.category} onChange={handle} className="form-input" />
            </div>
            <div>
              <label className="form-label">Type</label>
              <input name="type" value={form.type} onChange={handle} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Location</label>
              <input name="location" value={form.location} onChange={handle} className="form-input" />
            </div>
            <div>
              <label className="form-label">Salary</label>
              <input name="salary" value={form.salary} onChange={handle} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea name="description" value={form.description} onChange={handle} className="form-textarea" rows={4} />
          </div>
          <div>
            <label className="form-label">Requirements</label>
            <textarea name="requirements" value={form.requirements} onChange={handle} className="form-textarea" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Deadline</label>
              <input type="date" name="deadline" value={form.deadline} onChange={handle} className="form-input" />
            </div>
            <div>
              <label className="form-label">Application URL</label>
              <input name="applicationUrl" value={form.applicationUrl} onChange={handle} className="form-input" placeholder="https://" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="secondary-button flex-1 justify-center">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving} className="primary-button flex-1 justify-center">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageJobsPage;
