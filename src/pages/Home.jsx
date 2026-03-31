import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

import GlassNav from "@/components/home/GlassNav";
import PersistentBar from "@/components/home/PersistentBar";
import FeatureHighlights from "@/components/home/FeatureHighlights";
import StatPanel from "@/components/home/StatPanel";
import FullBleedSlider from "@/components/home/FullBleedSlider";
import StyleGallery from "@/components/home/StyleGallery";
import PullQuote from "@/components/home/PullQuote";

/* ── How It Works ────────────────────────────────────────────────────────── */
const STEPS = [
  { n: "01", title: "Upload a photo",    desc: "Any room. Phone camera is fine. We handle the rest." },
  { n: "02", title: "Choose a style",    desc: "Modern, Scandi, Industrial, Art Deco and 5 more." },
  { n: "03", title: "AI generates",      desc: "Your redesigned room in 20–35 seconds. No waiting." },
  { n: "04", title: "Shop the look",     desc: "Find and buy the exact furniture shown — on Amazon and IKEA." },
];

export default function Home() {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleStart = () => {
    if (user) navigate(createPageUrl("Studio"));
    else base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"));
  };

  return (
    <div style={{ background: "#000", minHeight: "100vh", fontFamily: "'Inter', -apple-system, system-ui, sans-serif", overflowX: "hidden" }}>

      {/* ── Glass Nav (replaces layout nav on Home only via portal-like overlay) */}
      <GlassNav onStart={handleStart} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100svh", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px clamp(24px,6vw,80px) 60px" }}>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}>
          <div className="overline-txt" style={{ color: "#1B8FA0", marginBottom: 24 }}>AI Interior Design</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}>
          <div className="headline-lg" style={{ color: "#fff", display: "block" }}>Redesign your space</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}>
          <div className="headline-xl" style={{ background: "linear-gradient(135deg, #1B8FA0 0%, #C9963A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "block", margin: "4px 0" }}>
            with AI.
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.55, ease: [0.25, 0.1, 0.25, 1] }}>
          <div className="headline-sm" style={{ color: "rgba(255,255,255,0.38)", display: "block", marginBottom: 40 }}>in minutes.</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.1, 0.25, 1] }}>
          <button onClick={handleStart}
            style={{ background: "linear-gradient(135deg,#1B8FA0,#C9963A)", color: "#fff", fontSize: "clamp(15px,1.5vw,18px)", fontWeight: 700, padding: "18px 44px", borderRadius: 100, border: "none", cursor: "pointer", boxShadow: "0 8px 40px rgba(27,143,160,0.35)", transition: "opacity 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            Start Designing Free →
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.9 }}
          style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>★★★★★</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>4.9 rating · 10,000+ rooms redesigned</span>
        </motion.div>

        {/* Hero image — appears below fold */}
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ marginTop: 80, width: "100%", maxWidth: 1120, borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.7)" }}>
          <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=90" alt="AI redesigned room" style={{ width: "100%", height: "auto", display: "block" }} />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: "#f5f5f7", padding: "clamp(80px,12vw,160px) clamp(24px,6vw,80px)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8 }} style={{ marginBottom: 80 }}>
            <div className="overline-txt" style={{ color: "#1B8FA0", marginBottom: 16 }}>How it works</div>
            <div className="headline-lg" style={{ color: "#1d1d1f", maxWidth: 600 }}>From photo to redesigned room.</div>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2 }}>
            {STEPS.map((s, i) => (
              <motion.div key={s.n}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ padding: "40px 32px", background: i % 2 === 0 ? "#fff" : "#f5f5f7", borderRadius: 20 }}>
                <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.05em", color: "#e5e5ea", marginBottom: 24 }}>{s.n}</div>
                <div className="headline-sm" style={{ color: "#1d1d1f", marginBottom: 12 }}>{s.title}</div>
                <p className="body-md" style={{ color: "#6e6e73" }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE HIGHLIGHTS (sticky tabs) ─────────────────────────────── */}
      <FeatureHighlights />

      {/* ── STAT CALLOUTS ─────────────────────────────────────────────────── */}
      <StatPanel stat="20" label="minutes" body="From photo to complete redesign. No architect. No waiting." bg="#000" labelColor="#C9963A" />
      <StatPanel stat="8"  label="design styles" body="Japandi to Art Deco. Pick one, transform any room instantly." bg="#111114" labelColor="#1B8FA0" />
      <StatPanel stat="10000" label="rooms redesigned" body="Homeowners, architects, and designers across Europe." bg="#000" labelColor="#C9963A" />

      {/* ── FULL-BLEED BEFORE/AFTER ──────────────────────────────────────── */}
      <FullBleedSlider />

      {/* ── STYLE GALLERY (sticky scroll) ────────────────────────────────── */}
      <StyleGallery onStart={handleStart} />

      {/* ── PULL QUOTE ───────────────────────────────────────────────────── */}
      <PullQuote />

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{ background: "#000", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "clamp(80px,12vw,160px) clamp(24px,6vw,80px)" }}>
        <div style={{ maxWidth: 700 }}>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <div className="overline-txt" style={{ color: "#1B8FA0", marginBottom: 24 }}>Start Designing</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }}>
            <div className="headline-xl" style={{ color: "#fff", marginBottom: 24 }}>Your dream room<br/>is one photo away.</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}>
            <p className="body-lg" style={{ color: "rgba(255,255,255,0.5)", marginBottom: 48 }}>Upload any room photo and watch AI redesign it in seconds.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.45 }}>
            <button onClick={handleStart}
              style={{ background: "linear-gradient(135deg,#1B8FA0,#C9963A)", color: "#fff", fontSize: 18, fontWeight: 700, padding: "18px 44px", borderRadius: 100, border: "none", cursor: "pointer", boxShadow: "0 8px 40px rgba(27,143,160,0.3)", transition: "opacity 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              Start Designing Free →
            </button>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 20 }}>No credit card · Free to start · Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      {/* ── PERSISTENT PURCHASE BAR ──────────────────────────────────────── */}
      <PersistentBar onStart={handleStart} />
    </div>
  );
}