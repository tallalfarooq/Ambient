import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import HeroSlider from "@/components/home/HeroSlider";

// ─── Data ────────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  "AI-Powered Design", "Stable Diffusion", "8 Design Styles",
  "Shop Every Piece", "Instant Results", "No Designer Needed",
];

const TRUST = [
  { number: "12K+",  label: "Rooms Transformed"  },
  { number: "8",     label: "AI Design Styles"    },
  { number: "< 60s", label: "Average Generation"  },
  { number: "4.9★",  label: "User Rating"         },
  { number: "Free",  label: "To Get Started"      },
];

const STEPS = [
  { n: "01", icon: "📸", title: "Upload Your Room",  desc: "Take a photo of any room — bedroom, living room, kitchen, or home office. Any angle, any lighting." },
  { n: "02", icon: "✦",  title: "Choose Your Style", desc: "Pick from 8 curated design worlds — from Japandi serenity to Industrial bold. Each powered by a custom LoRA model." },
  { n: "03", icon: "🛒", title: "Shop the Look",     desc: "Every piece of furniture in your redesigned room is shoppable. One click to Amazon, IKEA, or eBay." },
];

const STYLES = [
  { name: "Japandi",          desc: "Calm · Natural · Intentional",    badge: "Most Popular", bg: ["#f0ede6", "#c0b095"] },
  { name: "Industrial",       desc: "Raw · Bold · Unfinished",         badge: "Bold & Raw",   bg: ["#2d2820", "#3a3020"] },
  { name: "Boho",             desc: "Layered · Textured · Wanderlust", badge: "Wanderlust",   bg: ["#8b6040", "#d0a880"] },
  { name: "Modern Minimal",   desc: "Clean · Purposeful · Airy",       badge: "Clean Lines",  bg: ["#e8e8e8", "#b0b0b0"] },
  { name: "Cottagecore",      desc: "Soft · Nostalgic · Cozy",         badge: "Cozy",         bg: ["#7a9060", "#c8d8a8"] },
  { name: "Mid-Century",      desc: "Iconic · Warm · Timeless",        badge: "Premium",      bg: ["#2a2010", "#4a4030"] },
  { name: "Scandi",           desc: "Warm · Light · Functional",       badge: "Hygge",        bg: ["#f5f5f0", "#c8c8c0"] },
  { name: "Art Deco",         desc: "Dramatic · Geometric · Opulent",  badge: "Avant-garde",  bg: ["#1a0a2a", "#501a60"] },
];

const TESTIMONIALS = [
  {
    stars: 5, featured: true,
    text: `"I uploaded a photo of my sad, beige living room on a Tuesday evening. By Wednesday morning I had ordered a new sofa, two lamps, and a rug — all from the AI-generated design. It was uncanny how well it matched my taste."`,
    name: "Sarah M.", role: "Interior design enthusiast, Berlin", avatar: "S", color: "from-amber-400 to-orange-400",
  },
  {
    stars: 5,
    text: `"The Japandi style completely transformed my bedroom. I had no idea what style I even wanted until I saw it generated. Now I know exactly what I love."`,
    name: "Kai L.", role: "Architect, Amsterdam", avatar: "K", color: "from-emerald-400 to-teal-500",
  },
  {
    stars: 5,
    text: `"This replaced a €2,000 interior design consultation. I got the same result — a vision for my space — for free, in 45 seconds."`,
    name: "Priya K.", role: "Product Manager, London", avatar: "P", color: "from-violet-400 to-purple-500",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-t border-b border-white/6 py-4">
      <div className="flex gap-12 animate-[ticker_22s_linear_infinite] w-max">
        {items.map((t, i) => (
          <div key={i} className="flex items-center gap-4 flex-shrink-0">
            <span className="w-1 h-1 rounded-full" style={{ background: "#c9a96e" }} />
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#5a5550" }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 py-10 px-6 border-t border-b border-white/6">
      {TRUST.map((t, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ background: "linear-gradient(135deg, #c9a96e, #d4756b, #9b7ec8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t.number}
          </span>
          <span className="text-xs font-medium tracking-wide" style={{ color: "#5a5550" }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function StyleCard({ s, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, duration: 0.5 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      className="relative rounded-3xl overflow-hidden cursor-pointer group"
      style={{ aspectRatio: "3/4", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Room bg gradient */}
      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ background: `linear-gradient(160deg, ${s.bg[0]} 0%, ${s.bg[1]} 100%)` }} />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 opacity-70 group-hover:opacity-90" />
      {/* Badge */}
      <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff" }}>
        {s.badge}
      </span>
      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
        <div className="text-base font-bold text-white tracking-tight">{s.name}</div>
        <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>{s.desc}</div>
      </div>
    </motion.div>
  );
}

function TestimonialCard({ t, i }) {
  const stars = "★".repeat(t.stars);
  if (t.featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} viewport={{ once: true }}
        className="col-span-1 sm:col-span-2 lg:col-span-3 rounded-3xl overflow-hidden border border-white/8 grid sm:grid-cols-2"
        style={{ background: "#1a1a1a" }}
      >
        <div className="p-8 sm:p-12">
          <div className="text-base mb-5" style={{ color: "#c9a96e", letterSpacing: 3 }}>{stars}</div>
          <p className="text-base sm:text-lg leading-relaxed italic mb-8" style={{ color: "#a09890" }}>{t.text}</p>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${t.color}`} style={{ color: "#fff" }}>{t.avatar}</div>
            <div>
              <div className="text-sm font-bold text-white">{t.name}</div>
              <div className="text-xs" style={{ color: "#5a5550" }}>{t.role}</div>
            </div>
          </div>
        </div>
        <div className="relative hidden sm:flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2a2018, #3d3020)", minHeight: 200 }}>
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(201,169,110,0.08), transparent 60%)" }} />
          <span className="text-6xl opacity-30">🛋️</span>
          <span className="absolute bottom-4 left-4 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.6)" }}>Japandi transformation</span>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
      className="rounded-3xl p-8 border border-white/8 hover:border-amber-500/20 transition-all duration-300 group"
      style={{ background: "#1a1a1a" }}
    >
      <div className="text-sm mb-4" style={{ color: "#c9a96e", letterSpacing: 3 }}>{stars}</div>
      <p className="text-sm leading-relaxed italic mb-6" style={{ color: "#a09890" }}>{t.text}</p>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${t.color}`} style={{ color: "#fff" }}>{t.avatar}</div>
        <div>
          <div className="text-sm font-bold text-white">{t.name}</div>
          <div className="text-xs" style={{ color: "#5a5550" }}>{t.role}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [user, setUser] = useState(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleStart = () => {
    if (user) navigate(createPageUrl("Studio"));
    else setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#0d0d0d" }}>

      {/* Global keyframes */}
      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes floatOrb { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(20px,-30px) scale(1.05);} 66%{transform:translate(-15px,20px) scale(.95);} }
      `}</style>

      {/* ── Ticker ── */}
      <Ticker />

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden" style={{ paddingTop: 64 }}>
        {/* Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[600px] h-[600px] rounded-full" style={{ top: -120, right: -120, background: "radial-gradient(circle, rgba(201,169,110,0.12), transparent 70%)", filter: "blur(80px)", animation: "floatOrb 8s ease-in-out infinite" }} />
          <div className="absolute w-[500px] h-[500px] rounded-full" style={{ bottom: 0, left: -80, background: "radial-gradient(circle, rgba(212,117,107,0.1), transparent 70%)", filter: "blur(80px)", animation: "floatOrb 8s ease-in-out infinite", animationDelay: "-3s" }} />
          <div className="absolute w-[350px] h-[350px] rounded-full" style={{ top: "40%", left: "40%", background: "radial-gradient(circle, rgba(155,126,200,0.08), transparent 70%)", filter: "blur(80px)", animation: "floatOrb 8s ease-in-out infinite", animationDelay: "-6s" }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-4xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-xs font-semibold tracking-widest uppercase" style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)", color: "#c9a96e" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#c9a96e" }} />
            Powered by Stable Diffusion
          </div>

          {/* Headline */}
          <h1 className="font-bold leading-[1.05] mb-6" style={{ fontSize: "clamp(46px, 7vw, 88px)", letterSpacing: "-3px" }}>
            Your room,{" "}
            <span style={{ background: "linear-gradient(135deg, #c9a96e 0%, #d4756b 50%, #9b7ec8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              reimagined
            </span>
            {" "}by AI
          </h1>

          {/* Sub */}
          <p className="mb-12 max-w-2xl mx-auto leading-relaxed" style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "#a09890" }}>
            Upload a photo of any room. Choose a design style. Watch AI transform it — then shop every single piece.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={handleStart}
              className="group flex items-center gap-2 font-semibold transition-all duration-300"
              style={{ background: "linear-gradient(135deg, #c9a96e, #e8c98a)", color: "#1a1208", fontSize: 16, padding: "16px 36px", borderRadius: 100, boxShadow: "0 8px 32px rgba(201,169,110,0.3)" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(201,169,110,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(201,169,110,0.3)"; }}
            >
              Start designing free <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </button>
            <Link
              to={createPageUrl("Projects")}
              className="flex items-center gap-2 font-medium text-base transition-all duration-300"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", padding: "15px 28px", borderRadius: 100 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "transparent"; }}
            >
              View my designs ↓
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#5a5550" }}>
              <span style={{ color: "#c9a96e" }}>★★★★★</span> 4.9 rating
            </div>
            <div className="w-px h-4 hidden sm:block" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-sm" style={{ color: "#5a5550" }}>12,000+ rooms redesigned</div>
            <div className="w-px h-4 hidden sm:block" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-sm" style={{ color: "#5a5550" }}>Free to start</div>
          </div>
        </motion.div>
      </section>

      {/* ── Hero Visual ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-10 pb-20">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.9 }}>
          <HeroSlider />
        </motion.div>
      </div>

      {/* ── Trust Bar ── */}
      <TrustBar />

      {/* ── How It Works ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
            <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#c9a96e" }}>How It Works</div>
            <h2 className="font-bold leading-tight mb-5" style={{ fontSize: "clamp(32px, 4vw, 56px)", letterSpacing: "-2px" }}>Three steps to your<br />dream room</h2>
            <p className="text-lg max-w-md" style={{ color: "#a09890" }}>No design background needed. Just a photo, a vibe, and 60 seconds.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} viewport={{ once: true }}
                className="p-10 group transition-colors duration-300 hover:bg-white/[0.03]"
                style={{ borderRight: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : undefined }}
              >
                <div className="text-6xl font-black mb-8 leading-none tracking-[-4px]" style={{ background: "linear-gradient(180deg, rgba(201,169,110,0.35), rgba(201,169,110,0.04))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.n}</div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.2)" }}>{s.icon}</div>
                <div className="text-lg font-bold mb-3 tracking-tight">{s.title}</div>
                <div className="text-sm leading-relaxed" style={{ color: "#a09890" }}>{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Style Worlds ── */}
      <section className="py-28 px-6" style={{ background: "#141414", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#c9a96e" }}>Design Worlds</div>
                <h2 className="font-bold leading-tight" style={{ fontSize: "clamp(32px, 4vw, 52px)", letterSpacing: "-2px" }}>8 styles, each a<br />trained AI model</h2>
              </motion.div>
            </div>
            <button onClick={handleStart} className="text-sm font-medium flex-shrink-0 px-5 py-3 rounded-full transition-all duration-300" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            >
              Explore all styles →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STYLES.map((s, i) => <StyleCard key={s.name} s={s} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-14">
            <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#c9a96e" }}>Loved by homeowners</div>
            <h2 className="font-bold leading-tight" style={{ fontSize: "clamp(32px, 4vw, 52px)", letterSpacing: "-2px" }}>Real rooms, real results</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => <TestimonialCard key={i} t={t} i={i} />)}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-40 px-6 text-center relative overflow-hidden" style={{ background: "#141414", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(201,169,110,0.05), transparent 70%)" }} />
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10 max-w-3xl mx-auto">
          <div className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: "#c9a96e" }}>Start Today — It's Free</div>
          <h2 className="font-bold mb-6" style={{ fontSize: "clamp(36px, 5vw, 72px)", letterSpacing: "-2.5px", lineHeight: 1.08 }}>
            Your dream room is{" "}
            <span style={{ background: "linear-gradient(135deg, #c9a96e, #d4756b, #9b7ec8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              60 seconds away
            </span>
          </h2>
          <p className="mb-12 text-lg" style={{ color: "#a09890" }}>No credit card. No design skills. Just your room and a vision.</p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 font-semibold transition-all duration-300"
            style={{ background: "linear-gradient(135deg, #c9a96e, #e8c98a)", color: "#1a1208", fontSize: 18, padding: "20px 44px", borderRadius: 100, boxShadow: "0 8px 32px rgba(201,169,110,0.3)" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(201,169,110,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(201,169,110,0.3)"; }}
          >
            Open the Studio free <span>→</span>
          </button>
        </motion.div>
      </section>

      {/* ── Auth Modal ── */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl p-8 text-center shadow-2xl"
              style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg, #c9a96e, #d4756b)" }}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Start designing for free</h2>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                Create a free account to generate AI room designs, detect furniture and shop every piece — all in one place.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full font-semibold py-3.5 rounded-2xl text-sm transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #e8c98a)", color: "#1a1208" }}
                >
                  Sign up — it's free
                </button>
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full font-medium py-3.5 rounded-2xl text-sm transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                >
                  Sign in to existing account
                </button>
              </div>
              <p className="text-xs mt-6" style={{ color: "rgba(255,255,255,0.25)" }}>No credit card required. Free to use.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}