import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, Loader2, Save, X, Camera } from "lucide-react";
import api from "../api/axios";
import { uploadImageToR2 } from "../utils/uploadImage";

export default function EditProductScreen({ setPage }) {
  const productId = sessionStorage.getItem("edit_product_id");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", price: "", description: "", images: [] });
  const fileRef = useRef(null);

  useEffect(() => {
    if (!productId) { setPage("business-products"); return; }
    api.get("/profile/business/products").then(r => {
      const found = (r.data.products || []).find(p => p._id === productId);
      if (found) setForm({ name: found.name, price: found.price, description: found.description || "", images: found.images || [] });
    }).finally(() => setLoading(false));
  }, [productId]);

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.images.length >= 5) { setError("Max 5 images"); return; }
    setUploading(true);
    try {
      const { imageUrl } = await uploadImageToR2(file);
      setForm(f => ({ ...f, images: [...f.images, imageUrl] }));
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeImage = (i) => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }));

  const save = async () => {
    if (!form.name.trim() || !form.price) { setError("Name and price required"); return; }
    setSaving(true);
    try {
      await api.put(`/profile/business/product/${productId}`, {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim(),
        images: form.images,
      });
      setPage("business-products");
    } catch (e) {
      setError(e.response?.data?.message || "Failed");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="spin text-indigo-400" /></div>;

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button className="text-slate-500 flex items-center gap-2 mb-5" onClick={() => setPage("business-products")}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-lg font-bold text-white mb-4">Edit Product</h1>

        <div className="biz-post-form">
          <div className="biz-post-field">
            <label>Photos ({form.images.length}/5)</label>
            <div className="biz-images-grid">
              {form.images.map((url, i) => (
                <div key={i} className="biz-image-thumb">
                  <img src={url} alt="" />
                  <button className="biz-image-remove" onClick={() => removeImage(i)}><X size={12} /></button>
                </div>
              ))}
              {form.images.length < 5 && (
                <button className="biz-image-add" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 size={20} className="spin" /> : <><Camera size={20} /><span>Add</span></>}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAddImage} style={{ display: "none" }} />
          </div>

          <div className="biz-post-field">
            <label>Name</label>
            <input className="biz-post-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="biz-post-field">
            <label>Price (USD)</label>
            <input className="biz-post-input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>

          <div className="biz-post-field">
            <label>Description</label>
            <textarea className="biz-post-input" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {error ? <div className="text-xs text-red-400">{error}</div> : null}

          <button className="primary-button w-full justify-center mt-4" disabled={saving} onClick={save}>
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
