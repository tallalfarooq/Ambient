import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScroll, useTransform } from "framer-motion";

const TABS = [
  {
    number: "01",
    label: "AI Redesign",
    headline: "Your room. Completely transformed.",
    body: "Upload any photo and watch AI redesign it in seconds. No architect. No waiting. Just your vision.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=85",
    imageB: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85",
  },
  {
    number: "02",
    label: "Style Match",
    headline: "8 signature styles. Infinite possibilities.",
    body: "From serene Japandi to bold Art Deco. Every style is trained on thousands of real interiors.",
    image: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=85",
  },
  {
    number: "03",
    label: "Shop the Look",
    headline: "See it. Love it. Buy it.",
    body: "AI identifies every piece of furniture in your render and finds exact matches on Amazon and IKEA.",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
  },
  {
    number: "04",
    label: "Instant Result",
    headline: "20 minutes. Photo to redesigned room.",
    body: "What used to take weeks with an interior designer now takes the length of a coffee break.",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85",
  },
];

export default function FeatureHighlights() {
  const containerRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    if (isMobile) return;
    const unsub = scrollYProgress.on("change", (v) => {
      setActiveTab(Math.min(3, Math.floor(v * 4)));
    });
    return unsub;
  }, [scrollYProgress, isMobile]);

  const tab = TABS[activeTab];

  if (isMobile) {
    return (
      <section style={{ background: "#000", padding: "80px 0" }}>
        {/* Mobile pill tabs */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 24px 24px", scrollbarWidth: "none" }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              style={{
                flexShrink: 0, padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s",
                background: activeTab === i ? "#1B8FA0" : "rgba(255,255,255,0.08)",
                color: activeTab === i ? "#fff" : "rgba(255,255,255,0.5)",
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            style={{ padding: "0 24px" }}>
            <img src={TABS[activeTab].image} alt={TABS[activeTab].label} style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: 20, marginBottom: 24 }} />
            <div className="headline-sm" style={{ color: "#fff", marginBottom: 12 }}>{TABS[activeTab].headline}</div>
            <p className="body-md" style={{ color: "rgba(255,255,255,0.52)" }}>{TABS[activeTab].body}</p>
          </motion.div>
        </AnimatePresence>
      </section>
    );
  }

  return (
    // Outer: 4x 100vh tall — gives 4 scroll "pages"
    <div ref={containerRef} style={{ height: "400vh", background: "#000" }}>
      {/* Sticky inner */}
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex", alignItems: "stretch" }}>
        {/* Left rail — tabs */}
        <div style={{ width: "38%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 clamp(40px,5vw,80px)" }}>
          <div className="overline-txt" style={{ color: "#1B8FA0", marginBottom: 40 }}>Feature Highlights</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TABS.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "16px 20px", borderRadius: 14, transition: "all 0.3s",
                  background: activeTab === i ? "rgba(27,143,160,0.1)" : "transparent",
                  borderLeft: `3px solid ${activeTab === i ? "#1B8FA0" : "transparent"}`,
                }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: activeTab === i ? "#1B8FA0" : "rgba(255,255,255,0.3)", letterSpacing: "0.1em", marginBottom: 4 }}>{t.number}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: activeTab === i ? "#fff" : "rgba(255,255,255,0.4)", letterSpacing: "-0.02em" }}>{t.label}</div>
              </button>
            ))}
          </div>

          {/* Content text below tabs */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
              style={{ marginTop: 48 }}>
              <div className="headline-sm" style={{ color: "#fff", marginBottom: 16 }}>{tab.headline}</div>
              <p className="body-md" style={{ color: "rgba(255,255,255,0.52)" }}>{tab.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right panel — full-bleed image */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            <motion.img key={activeTab} src={tab.image} alt={tab.label}
              initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AnimatePresence>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.3), transparent)" }} />
        </div>
      </div>
    </div>
  );
}