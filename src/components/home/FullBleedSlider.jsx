import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

const BEFORE = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=85";
const AFTER  = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=85";

export default function FullBleedSlider() {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [hoverHandle, setHoverHandle] = useState(false);
  const containerRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const clamp = (v) => Math.max(2, Math.min(98, v));

  const updateFromClientX = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  // Auto-animate on load
  useEffect(() => {
    let frame;
    let p = 70;
    let dir = -1;
    const animate = () => {
      if (dragging) return;
      p += dir * 0.25;
      if (p < 30) dir = 1;
      if (p > 70) dir = -1;
      setPos(p);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  return (
    <section style={{ background: "#000" }}>
      {/* Floating header */}
      <div style={{ textAlign: "center", padding: "clamp(60px,8vw,120px) clamp(24px,6vw,80px) 0" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <div className="overline-txt" style={{ color: "#1B8FA0", marginBottom: 16 }}>Before &amp; After</div>
          <div className="headline-lg" style={{ color: "#fff", marginBottom: 16 }}>
            See the<span style={{ background: "linear-gradient(135deg,#1B8FA0,#C9963A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}> transformation</span>.
          </div>
          <p className="body-lg" style={{ color: "rgba(255,255,255,0.52)", maxWidth: 500, margin: "0 auto 48px" }}>
            Drag the handle to compare. Same room — before and after AI redesign.
          </p>
        </motion.div>
      </div>

      {/* Full-bleed slider — no card, no border-radius */}
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", cursor: "ew-resize", userSelect: "none" }}
        onMouseDown={(e) => { setDragging(true); updateFromClientX(e.clientX); }}
        onMouseMove={(e) => { if (dragging) updateFromClientX(e.clientX); }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(e) => { setDragging(true); updateFromClientX(e.touches[0].clientX); }}
        onTouchMove={(e) => { if (dragging) updateFromClientX(e.touches[0].clientX); }}
        onTouchEnd={() => setDragging(false)}
      >
        <img src={AFTER} alt="After" draggable={false} style={{ width: "100%", height: "auto", display: "block", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", width: `${pos}%`, pointerEvents: "none" }}>
          <img src={BEFORE} alt="Before" draggable={false}
            style={{ position: "absolute", inset: 0, height: "100%", objectFit: "cover", pointerEvents: "none",
              width: containerRef.current?.offsetWidth ?? "100%" }} />
        </div>

        {/* Divider line */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pos}%`, transform: "translateX(-50%)", width: 2, background: "rgba(255,255,255,0.8)", boxShadow: "0 0 16px rgba(255,255,255,0.4)", pointerEvents: "none" }}>
          {/* Handle */}
          <div
            onMouseEnter={() => setHoverHandle(true)}
            onMouseLeave={() => setHoverHandle(false)}
            style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `translate(-50%,-50%) scale(${hoverHandle ? 1.15 : 1})`,
              width: 48, height: 48, borderRadius: "50%", background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)", transition: "transform 0.2s",
              pointerEvents: "auto", cursor: "ew-resize",
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5">
              <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <div style={{ position: "absolute", top: 16, left: 16, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 100, pointerEvents: "none" }}>Before</div>
        <div style={{ position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(27,143,160,0.8)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: 100, pointerEvents: "none" }}>After ✦</div>
      </div>
    </section>
  );
}