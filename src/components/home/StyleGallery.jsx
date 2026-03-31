import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STYLES = [
  { name: "Japandi",           desc: "Minimal · Organic · Serene",     badge: "Most Popular", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85" },
  { name: "Modern Minimal",    desc: "Clean · Bold · Functional",      badge: "Trending",     img: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=85" },
  { name: "Industrial",        desc: "Raw · Urban · Textured",         badge: "Bold",         img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85" },
  { name: "Boho Chic",         desc: "Warm · Layered · Earthy",        badge: "Cozy",         img: "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=1200&q=85" },
  { name: "Scandinavian",      desc: "Light · Airy · Functional",      badge: "Clean",        img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85" },
  { name: "Mid-Century Modern",desc: "Retro · Warm · Timeless",        badge: "Classic",      img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=85" },
  { name: "Art Deco",          desc: "Glamorous · Bold · Geometric",   badge: "Premium",      img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1200&q=85" },
  { name: "Cottagecore",       desc: "Romantic · Soft · Natural",      badge: "Dreamy",       img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=85" },
];

export default function StyleGallery({ onStart }) {
  const containerRef = useRef(null);
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  useEffect(() => {
    if (isMobile) return;
    const unsub = scrollYProgress.on("change", (v) => {
      setActive(Math.min(STYLES.length - 1, Math.floor(v * STYLES.length)));
    });
    return unsub;
  }, [scrollYProgress, isMobile]);

  if (isMobile) {
    return (
      <section id="styles" style={{ background: "#fff", padding: "80px 0" }}>
        <div style={{ padding: "0 24px 32px" }}>
          <div className="overline-txt" style={{ color: "#1B8FA0", marginBottom: 12 }}>Design Styles</div>
          <div className="headline-md" style={{ color: "#1d1d1f" }}>Find your aesthetic.</div>
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", padding: "0 24px 24px", scrollbarWidth: "none" }}>
          {STYLES.map((s, i) => (
            <div key={i} style={{ flexShrink: 0, width: 240, borderRadius: 16, overflow: "hidden", background: "#f5f5f7" }}>
              <img src={s.img} alt={s.name} style={{ width: "100%", height: 180, objectFit: "cover" }} />
              <div style={{ padding: "16px" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f" }}>{s.name}</div>
                <div style={{ fontSize: 13, color: "#6e6e73", marginTop: 4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 24px" }}>
          <button onClick={onStart}
            style={{ width: "100%", background: "linear-gradient(135deg,#1B8FA0,#C9963A)", color: "#fff", fontSize: 16, fontWeight: 700, padding: "16px", borderRadius: 14, border: "none", cursor: "pointer" }}>
            Try a Style →
          </button>
        </div>
      </section>
    );
  }

  const s = STYLES[active];

  return (
    <div ref={containerRef} id="styles" style={{ height: `${STYLES.length * 100}vh`, background: "#fff" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex" }}>
        {/* Left: style info */}
        <div style={{ width: "40%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,5vw,80px)", background: "#fff" }}>
          <div className="overline-txt" style={{ color: "#1B8FA0", marginBottom: 16 }}>Design Styles</div>
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1B8FA0", background: "rgba(27,143,160,0.1)", padding: "4px 12px", borderRadius: 100, marginBottom: 16 }}>
                {s.badge}
              </div>
              <div className="headline-lg" style={{ color: "#1d1d1f", marginBottom: 16 }}>{s.name}</div>
              <p className="body-lg" style={{ color: "#6e6e73", marginBottom: 32 }}>{s.desc}</p>
              <button onClick={onStart}
                style={{ background: "linear-gradient(135deg,#1B8FA0,#C9963A)", color: "#fff", fontSize: 15, fontWeight: 700, padding: "14px 32px", borderRadius: 100, border: "none", cursor: "pointer" }}>
                Try {s.name} →
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6, marginTop: 48 }}>
            {STYLES.map((_, i) => (
              <button key={i} onClick={() => setActive(i)}
                style={{ width: active === i ? 24 : 8, height: 8, borderRadius: 100, border: "none", cursor: "pointer", transition: "all 0.3s",
                  background: active === i ? "#1B8FA0" : "#d2d2d7" }} />
            ))}
          </div>
        </div>

        {/* Right: full-bleed image */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            <motion.img key={active} src={s.img} alt={s.name}
              initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}