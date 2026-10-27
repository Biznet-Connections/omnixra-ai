// uploadImage.js — image upload via backend (avoids browser CORS on R2)
import api from "../api/axios";

const ALLOWED = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export async function uploadImageToR2(file) {
  if (!file) throw new Error("No file provided");
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Only JPG, PNG, WebP or GIF allowed");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be under 5MB");
  }

  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/jobs/upload/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (!data?.url) {
    throw new Error("Upload response missing URL");
  }

  return {
    imageUrl: data.url,
    imageName: file.name,
    imageSize: file.size,
  };
}
