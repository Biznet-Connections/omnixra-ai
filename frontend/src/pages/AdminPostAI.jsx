import React, { useState } from "react";
import { ArrowLeft, Image as ImageIcon, Sparkles, Send, X, Zap } from "lucide-react";
import api from "../api/axios";

function AdminPostAI({ setPage }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Max 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setImage(reader.result); setPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!text.trim() && !image) { setError("Write something or add an image"); return; }
    setPosting(true); setError("");
    try {
      await api.post("/admin/post-as-ai", { text: text.trim(), image });
      setSuccess(true);
      setText(""); setImage(null); setPreview(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post");
    } finally { setPosting(false); }
  };

  return (
    <div className="admin-root">
      <div className="admin-grid-bg" />
      <div className="admin-content">
        <button onClick={() => setPage("admin")} className="admin-back-btn">
          <ArrowLeft size={16} /> BACK TO COMMAND CENTER
        </button>

        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-orb"><Sparkles size={20} /></div>
            <div>
              <h1 className="admin-header-title">POST AS OMNIXRA AI</h1>
              <p className="admin-header-subtitle">Create content that appears as the AI assistant.</p>
            </div>
          </div>
        </div>

        <div className="admin-post-panel">
          <div className="admin-post-preview-header">
            <div className="admin-ai-avatar"><Zap size={14} /></div>
            <div>
              <div className="admin-ai-name">Omnixra AI <span className="admin-ai-verified">✓</span></div>
              <div className="admin-ai-sub">AI Career Assistant · Posting as Admin</div>
            </div>
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What should Omnixra AI share today?"
            className="admin-post-textarea"
            rows={8}
          />

          {preview && (
            <div className="admin-post-image-wrap">
              <img src={preview} alt="Preview" />
              <button onClick={() => { setImage(null); setPreview(null); }} className="admin-post-image-remove">
                <X size={16} />
              </button>
            </div>
          )}

          {error && <div className="admin-error">⚠️ {error}</div>}
          {success && <div className="admin-success">✅ Posted successfully!</div>}

          <div className="admin-post-actions">
            <label className="admin-post-file-btn">
              <ImageIcon size={16} />
              <span>Add Image</span>
              <input type="file" accept="image/*" onChange={handleImage} hidden />
            </label>
            <button onClick={handlePost} disabled={posting} className="admin-submit-btn admin-post-submit">
              {posting ? "POSTING..." : <><Send size={16} /> POST NOW</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPostAI;
