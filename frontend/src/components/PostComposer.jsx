import React, { useState } from "react";
import { Image as ImageIcon, Video, X, Send, Sparkles, Globe, Users, Lock, Crop, Scissors, Radio, Paperclip, MapPin, FileText } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { usePosts } from "../context/PostsContext";
import { playSound } from "../utils/helpers";
import BoostModal from "./BoostModal";
import ImageCropper from "./ImageCropper";
import VideoTrimmer from "./VideoTrimmer";
import { generateVideoPoster } from "../utils/videoPoster";
import { uploadToR2 } from "../utils/r2Upload";

function formatSec(s) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ":" + String(sec).padStart(2, "0");
}

function TrimAwarePreview({ src, trimStart = 0, trimEnd = 0 }) {
  const videoRef = React.useRef(null);
  const hasTrim = trimEnd > trimStart;
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hasTrim && v.currentTime < trimStart) v.currentTime = trimStart;
  }, [trimStart, trimEnd, hasTrim]);
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    if (hasTrim && trimStart > 0 && trimStart < v.duration) v.currentTime = trimStart;
  };
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (hasTrim && v.currentTime >= trimEnd) {
      v.currentTime = trimStart;
      if (!v.paused) v.play().catch(() => {});
    }
  };
  return (
    <video ref={videoRef} src={src} controls playsInline preload="metadata" className="post-video" loop={!hasTrim} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} />
  );
}

function PostComposer({ onClose, onPosted, channelId, channelName }) {
  const { user } = useAuth();
  const { addPost, updatePost, removePost } = usePosts();
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoSize, setVideoSize] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState("");
  const [showCrop, setShowCrop] = useState(false);
  const [showTrim, setShowTrim] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const [showBoost, setShowBoost] = useState(false);
  const [newPost, setNewPost] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);

  const isChannel = !!channelId;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setError("File too large (max 25MB)"); return; }
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await api.post("/posts/upload-attachment", {
          fileData: reader.result,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        });
        setAttachment(res.data);
        console.log("Attachment uploaded:", res.data.url);
      } catch (err) {
        setError(err.response?.data?.message || "Upload failed");
        setAttachmentName("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setImagePreview(reader.result); setShowCrop(true); };
    reader.readAsDataURL(file);
  };

  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setError("Video too large. Max 50MB."); return; }
    setError("");
    setThumbnailUrl(null);
    setTrimStart(0);
    setTrimEnd(0);
    setVideoPreview(null);
    try {
      console.log("VIDEO pick:", file.size, "bytes");
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type || "video/mp4" });
      try { blob.name = file.name || "video.mp4"; } catch (err) {}
      setVideoBlob(blob);
      setVideoSize(blob.size);
      generateVideoPoster(blob).then((poster) => { if (poster) setThumbnailUrl(poster); });
      const reader = new FileReader();
      reader.onloadend = () => { setVideoPreview(reader.result); setShowTrim(true); };
      reader.onerror = () => { setError("Could not read video file."); };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Read video error:", err);
      setError("Could not read video file.");
    }
  };

  const handleCropDone = (croppedBlob) => {
    const reader = new FileReader();
    reader.onloadend = () => { setImage(reader.result); setImagePreview(reader.result); setShowCrop(false); };
    reader.readAsDataURL(croppedBlob);
  };

  const handleTrimDone = (result) => {
    setTrimStart(result.trimStart || 0);
    setTrimEnd(result.trimEnd || 0);
    setShowTrim(false);
  };

  const handleTrimCancel = () => {
    setShowTrim(false);
    if (trimStart === 0 && trimEnd === 0) {
      setVideoBlob(null);
      setVideoPreview(null);
      setVideoSize(0);
    }
  };

  const enhanceWithAI = async () => {
    if (!text.trim()) { setError("Write something first."); return; }
    setEnhancing(true);
    try {
      const res = await api.post("/ai/chat", {
        messages: [
          { role: "system", content: "Enhance the user post. Return ONLY the enhanced text. No prefixes, no quotes, no explanations." },
          { role: "user", content: "Enhance this post: " + JSON.stringify(text) }
        ]
      });
      let enhancedText = res.data.text || "";
      enhancedText = enhancedText
        .replace(/Certainly! Here is an enhanced version of (the |your )?post:?/gi, "")
        .replace(/Certainly! Here is an enhanced version:?/gi, "")
        .replace(/Here is an enhanced version of (the |your )?post:?/gi, "")
        .replace(/Here is an enhanced version:?/gi, "")
        .replace(/Here is an enhanced version:?/gi, "")
        .trim();
      setText(enhancedText);
    } catch (err) {
      setError("Could not enhance.");
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !image && !videoBlob) {
      setError("Write something or add a photo/video.");
      return;
    }
    if (posting) return;
    if (posted) return;
    setPosting(true);
    setError("");

    const tempId = "temp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    const optimisticPost = {
      _id: tempId,
      author: { _id: user._id, name: user.name, profilePicture: user.profilePicture, headline: user.headline, accountType: user.accountType },
      authorType: user.accountType,
      text: text.trim(),
      image,
      video: null,
      thumbnailUrl,
      trimStart,
      trimEnd,
      visibility,
      channelId: channelId || null,
      likes: 0,
      comments: [],
      shares: 0,
      createdAt: new Date(),
      pending: true,
      isUploading: !!videoBlob,
      uploadProgress: 0,
    };

    if (!isChannel) {
      addPost(optimisticPost);
      window.dispatchEvent(new CustomEvent("navigate-home"));
    }
    playSound("post");

    try {
      let videoKey = null;
      if (videoBlob) {
        setUploadProgress(1);
        if (!isChannel) updatePost(tempId, { uploadProgress: 1 });
        const contentType = videoBlob.type || "video/mp4";
        const result = await uploadToR2(
          videoBlob,
          contentType,
          (pct) => {
            const p = Math.max(1, Math.min(99, pct));
            setUploadProgress(p);
            if (!isChannel) updatePost(tempId, { uploadProgress: p });
          },
          "videos"
        );
        videoKey = result.key;
        setUploadProgress(100);
        if (!isChannel) updatePost(tempId, { uploadProgress: 100 });
      }

      const body = {
        text: text.trim(),
        image,
        videoKey,
        thumbnailUrl,
        trimStart,
        trimEnd,
        visibility: isChannel ? "public" : visibility,
        attachmentUrl: attachment?.url || null,
        attachmentName: attachment?.name || null,
        attachmentSize: attachment?.size || null,
        attachmentType: attachment?.type || null,
        location: locationName?.trim() ? { name: locationName.trim() } : null,
      };
      if (isChannel) body.channelId = channelId;

      const res = await api.post("/posts", body);

      if (!isChannel) {
        removePost(tempId);
        addPost(res.data);
      }
      setNewPost(res.data);
      setPosted(true);
    } catch (err) {
      console.error("Post failed:", err);
      if (!isChannel) {
        updatePost(tempId, { pending: false, isUploading: false, failed: true, errorMessage: (err && err.message) || "Failed to post" });
      }
      setError((err && err.response && err.response.data && err.response.data.message) || (err && err.message) || "Failed to post. Try again.");
    } finally {
      setUploadProgress(0);
      setPosting(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{isChannel ? "Post to channel" : "Create Post"}</h2>
            <button onClick={onClose} className="icon-button"><X size={18} /></button>
          </div>

          {isChannel && (
            <div className="channel-post-banner">
              <Radio size={14} />
              <span>Posting to <strong>{channelName || "channel"}</strong> â€” followers will see this update</span>
            </div>
          )}

          {posted && newPost ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">ðŸŽ‰</div>
              <h3 className="text-lg font-bold">{isChannel ? "Posted to channel!" : "Posted!"}</h3>
              {!isChannel && <p className="text-sm text-slate-500 mt-2">Boost this post to reach more people?</p>}
              <div className="flex gap-3 mt-5">
                {!isChannel && (
                  <button onClick={() => setShowBoost(true)} className="primary-button flex-1"><Sparkles size={16} /> Boost Post</button>
                )}
                <button onClick={() => { onPosted && onPosted(newPost); onClose(); }} className={isChannel ? "primary-button w-full" : "outline-button flex-1"}>{isChannel ? "Done" : "Skip"}</button>
              </div>
            </div>
          ) : (
            <>
              {!isChannel && (
                <div className="flex gap-3 items-center mb-4">
                  <div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">
                    {user && user.profilePicture ? <img src={user.profilePicture} alt="" loading="eager" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : ((user && user.name && user.name[0]) || "U")}
                  </div>
                  <div className="text-sm font-semibold">{(user && (user.name || user.companyName)) || "User"}</div>
                </div>
              )}

              <textarea value={text} onChange={e => setText(e.target.value)} className="form-textarea" rows={5} placeholder={isChannel ? "Share an update with your followers..." : "What is on your mind?"} />

              {imagePreview && !showCrop && (
                <div className="post-image-container mt-3 relative">
                  <img src={imagePreview} alt="Preview" className="post-image" decoding="async" />
                  <button onClick={() => setShowCrop(true)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5"><Crop size={16} /></button>
                </div>
              )}

              {videoPreview && !showTrim && (
                <div className="post-video-container mt-3 relative">
                  <TrimAwarePreview src={videoPreview} trimStart={trimStart} trimEnd={trimEnd} />
                  <button onClick={() => setShowTrim(true)} className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5"><Scissors size={16} /></button>
                  {trimEnd > trimStart && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full">
                      Plays {formatSec(trimStart)} to {formatSec(trimEnd)}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="mt-3 text-xs text-red-400">{error}</div>}

              {!isChannel && (
                <div className="mt-4">
                  <label className="form-label">Who can see this post?</label>
                  <div className="flex gap-2">
                    <button onClick={() => setVisibility("public")} className={"outline-button " + (visibility === "public" ? "category-active" : "")}><Globe size={14} /> Public</button>
                    <button onClick={() => setVisibility("connections")} className={"outline-button " + (visibility === "connections" ? "category-active" : "")}><Users size={14} /> Connections</button>
                    <button onClick={() => setVisibility("onlyme")} className={"outline-button " + (visibility === "onlyme" ? "category-active" : "")}><Lock size={14} /> Only Me</button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4 flex-wrap">
                <label className="outline-button cursor-pointer"><ImageIcon size={16} /> Photo<input type="file" accept="image/*" onChange={handleImageChange} className="hidden" /></label>
                <label className="outline-button cursor-pointer"><Video size={16} /> Video<input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" /></label>
                <label className="outline-button cursor-pointer">
                  <Paperclip size={16} /> {attachmentName || "File"}
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" onChange={handleFileChange} className="hidden" />
                </label>
                <button type="button" onClick={() => setShowLocationInput(!showLocationInput)} className={"outline-button " + (locationName ? "category-active" : "")}>
                  <MapPin size={16} /> {locationName || "Location"}
                </button>
                {!isChannel && <button onClick={enhanceWithAI} disabled={enhancing} className="outline-button text-indigo-400"><Sparkles size={16} /> {enhancing ? "Enhancing..." : "AI Enhance"}</button>}
                <button onClick={handleSubmit} disabled={posting} className="primary-button ml-auto">
                  {posting ? (uploadProgress > 0 && uploadProgress < 100 ? "Uploading " + uploadProgress + "%" : "Posting...") : "Post"}
                  <Send size={14} />
                </button>
              </div>

              {showLocationInput && (
                <div className="mt-3">
                  <label className="form-label">Add location</label>
                  <input
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Harare CBD"
                  />
                </div>
              )}

              {posting && uploadProgress > 0 && uploadProgress < 100 && (
                <div style={{ width: "100%", marginTop: 10 }}>
                  <div style={{ height: 4, background: "#1e1e2e", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: uploadProgress + "%", background: "linear-gradient(90deg, #6366f1, #a855f7)", transition: "width 0.2s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, textAlign: "center" }}>Uploading video... {uploadProgress}%</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCrop && <ImageCropper image={imagePreview} onCrop={handleCropDone} onCancel={() => setShowCrop(false)} />}
      {showTrim && <VideoTrimmer videoSrc={videoPreview} videoFile={videoBlob} onTrim={handleTrimDone} onCancel={handleTrimCancel} />}
      {showBoost && newPost && <BoostModal post={newPost} onClose={() => { setShowBoost(false); setPosted(false); onPosted && onPosted(newPost); onClose(); }} />}
    </>
  );
}

export default PostComposer;
