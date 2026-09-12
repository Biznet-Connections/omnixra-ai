// frontend/src/components/LazyImage.jsx
// Drop-in replacement for <img> with native lazy loading + async decoding.
// Falls back gracefully in older browsers (ignores unknown attributes).
import React from "react";

function LazyImage({
  src,
  alt = "",
  className = "",
  style = {},
  width,
  height,
  priority = false,   // set true for above-fold images (avatars, hero)
  ...rest
}) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...rest}
    />
  );
}

export default LazyImage;
