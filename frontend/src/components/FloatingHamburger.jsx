import React from "react";
import { X } from "lucide-react";

function FloatingHamburger({ mobileOpen, setMobileOpen }) {
  return (
    <button
      onClick={() => setMobileOpen(!mobileOpen)}
      className="floating-hamburger"
    >
      {mobileOpen ? (
        <X size={22} />
      ) : (
        <div className="custom-hamburger">
          <span className="line line-long" />
          <span className="line line-medium" />
          <span className="line line-short" />
        </div>
      )}
    </button>
  );
}

export default FloatingHamburger;
