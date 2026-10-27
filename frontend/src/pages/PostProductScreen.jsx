import React, { useState, useRef } from "react";
import { ArrowLeft, Plus, Loader2, X, Camera, Image as ImageIcon } from "lucide-react";
import api from "../api/axios";
import { uploadImageToR2 } from "../utils/uploadImage";

export default function PostProductScreen({ setPage }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);           // array of R2 URLs
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const MAX_IMAGES = 5;

  const handleImagePick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES) {
      setError(`Max ${MAX_IMAGES} images per product`);
      return;
    }

    setUploading(true);
    setError("");
    const uploaded = [];
    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is over 5MB`);
        }
        const { imageUrl } = await uploadImageToR2(file);
        uploaded.push(imageUrl);
      }
      setImages(prev => [...prev, ...uploaded]);
    } catch (err) {
      setError("Upload failed: " + (err.message || "unknown"));
      // Keep already-uploaded ones
      if (uploaded.length > 0) {
        setImages(prev => [...prev, ...uploaded]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!name.trim() || !price) {
      setError("Name and price are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/profile/business/product", {
        name: name.trim(),
        price: Number(price),
        description: description.trim(),
        images,
      });
      setPage("business-products");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button
          className="text-slate-500 flex items-center gap-2 mb-5"
          onClick={() => setPage("business-products")}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-lg font-bold text-white mb-4">Post a Product</h1>

        <div className="biz-post-form">
          {/* Image Upload */}
          <div className="biz-post-field">
            <label>Product Photos ({images.length}/{MAX_IMAGES})</label>
            <div className="biz-images-grid">
              {images.map((url, i) => (
                <div key={i} className="biz-image-thumb">
                  <img src={url} alt={`Product ${i + 1}`} />
                  <button
                    type="button"
                    className="biz-image-remove"
                    onClick={() => removeImage(i)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  className="biz-image-add"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 size={20} className="spin" />
                  ) : (
                    <>
                      <Camera size={20} />
                      <span>Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagePick}
              style={{ display: "none" }}
            />
            <p className="biz-post-hint">
              📸 Products with photos get 3x more inquiries
            </p>
          </div>

          <div className="biz-post-field">
            <label>Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Bosch Impact Drill"
              className="biz-post-input"
            />
          </div>

          <div className="biz-post-field">
            <label>Price (USD) *</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="45.00"
              className="biz-post-input"
            />
          </div>

          <div className="biz-post-field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your product..."
              className="biz-post-input"
              rows={4}
            />
          </div>

          {error ? <div className="text-xs text-red-400">{error}</div> : null}

          <button
            className="primary-button w-full justify-center mt-4"
            disabled={saving || uploading}
            onClick={submit}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            {saving ? "Publishing…" : "Publish Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
