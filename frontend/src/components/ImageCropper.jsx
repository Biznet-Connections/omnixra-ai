import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import ModalPortal from "./ModalPortal";

export default function ImageCropper({ image, onCrop, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const finishCrop = () => {
    if (!croppedAreaPixels || !image) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0, 0, canvas.width, canvas.height
      );
      canvas.toBlob((blob) => {
        if (blob && onCrop) onCrop(blob);
      }, "image/jpeg", 0.9);
    };
    img.src = image;
  };

  return (
    <ModalPortal>
      <div onClick={(e)=>e.stopPropagation()} style={{position:"fixed", top:0, left:0, width:"100vw", height:"100vh", background:"#000", zIndex:100000, display:"flex", flexDirection:"column"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", color:"#fff"}}>
          <button onClick={onCancel} style={{background:"none", border:"none", color:"#fff", fontSize:16}}>Cancel</button>
          <span style={{fontWeight:600, color:"#fff"}}>Crop photo</span>
          <button onClick={(e) => { e.stopPropagation(); finishCrop(); }} style={{background:"none", border:"none", color:"#4f8ef7", fontSize:16, fontWeight:600}}>Done</button>
        </div>
        <div style={{flex:1, position:"relative"}}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={4/3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div style={{padding:"8px 16px", textAlign:"center", color:"#888", fontSize:12}}>Pinch to zoom · Drag to adjust</div>
      </div>
    </ModalPortal>
  );
}
