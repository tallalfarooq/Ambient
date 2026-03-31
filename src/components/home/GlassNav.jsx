import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Styles", href: "#styles" },
  { label: "Pricing", page: "Pricing" },
];

export default function GlassNav({ onStart }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href) => {
    setMobileOpen(false);
    if (href.startsWith("#")) {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? "rgba(0,0,0,0.72)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 clamp(24px,6vw,80px)", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer" }}>
            <img src="https://media.base44.com/images/public/69a33ae1bd1ae899284f21e8/c8bd4ea0c_251dc708f_logo.png" alt="AmbientSpace" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover" }} />
            <span style={{ fontWeight: 800, color: "#fff", fontSize: 14, letterSpacing: "-0.02em" }}>Ambient<span style={{ color: "#6EC6C6" }}>Space</span></span>
          </button>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) =>
              l.page ? (
                <Link key={l.label} to={createPageUrl(l.page)} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", textDecoration: "none", fontWeight: 400, transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  {l.label}
                </Link>
              ) : (
                <button key={l.label} onClick={() => scrollTo(l.href)} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", background: "none", border: "none", cursor: "pointer", fontWeight: 400, transition: "color 0.2s" }}
                  onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.75)"}>
                  {l.label}
                </button>
              )
            )}
            <button onClick={onStart} style={{ background: "linear-gradient(135deg,#1B8FA0,#C9963A)", color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 18px", borderRadius: 100, border: "none", cursor: "pointer", transition: "opacity 0.2s" }}
              onMouseEnter={e => e.target.style.opacity = "0.85"} onMouseLeave={e => e.target.style.opacity = "1"}>
              Start Free →
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
            <button onClick={() => setMobileOpen(false)} style={{ position: "absolute", top: 20, right: 24, background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
              <X size={26} />
            </button>
            {NAV_LINKS.map((l) =>
              l.page ? (
                <Link key={l.label} to={createPageUrl(l.page)} onClick={() => setMobileOpen(false)}
                  style={{ fontSize: 28, fontWeight: 700, color: "#fff", textDecoration: "none", letterSpacing: "-0.02em" }}>
                  {l.label}
                </Link>
              ) : (
                <button key={l.label} onClick={() => scrollTo(l.href)}
                  style={{ fontSize: 28, fontWeight: 700, color: "#fff", background: "none", border: "none", cursor: "pointer", letterSpacing: "-0.02em" }}>
                  {l.label}
                </button>
              )
            )}
            <button onClick={() => { setMobileOpen(false); onStart(); }}
              style={{ background: "linear-gradient(135deg,#1B8FA0,#C9963A)", color: "#fff", fontSize: 18, fontWeight: 700, padding: "16px 40px", borderRadius: 100, border: "none", cursor: "pointer" }}>
              Start Designing Free →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}