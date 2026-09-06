import React, { useState } from "react";
import { Image as ImageIcon, Video, X, Send, Sparkles, Globe, Users, Lock, Crop, Scissors } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { playSound } from "../utils/helpers";
import BoostModal from "./BoostModal";
import ImageCropper from "./ImageCropper";
import VideoTrimmer from "./VideoTrimmer";

function PostComposer({ onClose, onPosted }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState("");
  const [showCrop, setShowCrop] = useState(false);
  const [showTrim, setShowTrim] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [showBoost, setShowBoost] = useState(false);
  const [newPost, setNewPost] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("Video too large. Max 10MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoPreview(reader.result);
      setShowTrim(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropDone = (croppedBlob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
      setShowCrop(false);
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleTrimDone = (trimData) => {
    console.log("Trim data:", trimData);
    setVideo(videoPreview);
    setShowTrim(false);
  };

  const handleTrimCancel = () => {
    setShowTrim(false);
  };

  const enhanceWithAI = async () => {
    if (!text.trim()) { setError("Write something first."); return; }
    setEnhancing(true);
    try {
      const res = await api.post("/ai/chat", { messages: [{ role: "system", content: "Enhance this post." }, { role: "user", content: text }] });
      setText(res.data.text);
    } catch (err) { setError("Could not enhance."); }
    finally { setEnhancing(false); }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image && !video) { setError("Write something or add a photo/video."); return; }
    setPosting(true);
    try {
      const res = await api.post("/posts", { text, image, video: videoPreview, visibility });
      setNewPost(res.data);
      setPosted(true);
      playSound("post");
    } catch (err) { setError(err.response?.data?.message || "Failed"); setPosting(false); }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Create Post</h2>
            <button onClick={onClose} className="icon-button"><X size={18} /></button>
          </div>

          {posted ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold">Posted!</h3>
              <p className="text-sm text-slate-500 mt-2">Boost this post to reach more people?</p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowBoost(true)} className="primary-button flex-1"><Sparkles size={16} /> Boost Post</button>
                <button onClick={() => { onPosted?.(newPost); onClose(); }} className="outline-button flex-1">Skip</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-3 items-center mb-4">
                <div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">
                  {user?.profilePicture ? <img src={user.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : user?.name?.[0] || "U"}
                </div>
                <div className="text-sm font-semibold">{user?.name || user?.companyName || "User"}</div>
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)} className="form-textarea" rows={5} placeholder="What's on your mind?" />
              
              {imagePreview && !showCrop && (
                <div className="post-image-container mt-3 relative">
                  <img src={imagePreview} alt="Preview" className="post-image" />
                  <button onClick={() => setShowCrop(true)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5"><Crop size={16} /></button>
                </div>
              )}
              
              {videoPreview && !showTrim && (
                <div className="post-video-container mt-3 relative">
                  <video src={videoPreview} controls className="post-video" />
                  <button onClick={() => setShowTrim(true)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5"><Scissors size={16} /></button>
                </div>
              )}

              {error && <div className="mt-3 text-xs text-red-400">{error}</div>}

              <div className="mt-4">
                <label className="form-label">Who can see this post?</label>
                <div className="flex gap-2">
                  <button onClick={() => setVisibility("public")} className={`outline-button ${visibility === "public" ? "category-active" : ""}`}><Globe size={14} /> Public</button>
                  <button onClick={() => setVisibility("connections")} className={`outline-button ${visibility === "connections" ? "category-active" : ""}`}><Users size={14} /> Connections</button>
                  <button onClick={() => setVisibility("onlyme")} className={`outline-button ${visibility === "onlyme" ? "category-active" : ""}`}><Lock size={14} /> Only Me</button>
                </div>
              </div>

              <div className="flex gap-2 mt-4 flex-wrap">
                <label className="outline-button cursor-pointer"><ImageIcon size={16} /> Photo<input type="file" accept="image/*" onChange={handleImageChange} className="hidden" /></label>
                <label className="outline-button cursor-pointer"><Video size={16} /> Video<input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" /></label>
                <button onClick={enhanceWithAI} disabled={enhancing} className="outline-button text-indigo-400"><Sparkles size={16} /> {enhancing ? "Enhancing..." : "AI Enhance"}</button>
                <button onClick={handleSubmit} disabled={posting} className="primary-button ml-auto">{posting ? "Posting..." : "Post"}<Send size={14} /></button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nested modals - rendered after backdrop, higher z-index */}
      {showCrop && (
        <ImageCropper image={imagePreview} onCrop={handleCropDone} onCancel={() => setShowCrop(false)} />
      )}
      {showTrim && (
        <VideoTrimmer videoSrc={videoPreview} onTrim={handleTrimDone} onCancel={handleTrimCancel} />
      )}
      {showBoost && <BoostModal post={newPost} onClose={() => { setShowBoost(false); onPosted?.(newPost); onClose(); }} />}
    </>
  );
}
export default PostComposer;
