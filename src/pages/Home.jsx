import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X, Play, Volume2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import HeroOrb from "@/components/home/HeroOrb";

const TICKER_ITEMS = [
  "Binaural Beats", "Nature Soundscapes", "Cosmic Drones",
  "Focus Music", "Sleep Stories", "Meditation Journeys",
];

const TRUST = [
  { number: "50K+",  label: "Active Listeners"    },
  { number: "200+",  label: "Sound Environments"  },
  { number: "24/7",  label: "Always Available"    },
  { number: "4.9★",  label: "User Rating"         },
  { number: "Free",  label: "To Start"            },
];

const STEPS = [
  { n: "01", icon: "🎧", title: "Choose Your Vibe",     desc: "Browse curated soundscapes — from forest rain to cosmic drones. Each environment crafted for deep focus or relaxation." },
  { n: "02", icon: "✦",  title: "Layer Your Sound",    desc: "Mix binaural beats, nature sounds, and ambient music. Create your perfect sonic atmosphere with our AI mixer." },
  { n: "03", icon: "🌌", title: "Enter the Flow State", desc: "Let the sound guide you. Whether studying, meditating, or sleeping — AmbiVerse adapts to your rhythm." },
];

const SOUNDSCAPES = [
  {
    name: "Forest Rain", desc: "Gentle · Soothing · Natural", badge: "Most Popular",
    img: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Cosmic Drift", desc: "Deep · Ethereal · Infinite", badge: "Editor's Pick",
    img: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Ocean Waves", desc: "Rhythmic · Calm · Meditative", badge: "Sleep",
    img: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "White Noise", desc: "Pure · Focus · Clarity", badge: "Study",
    img: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Tibetan Bowls", desc: "Sacred · Healing · Resonant", badge: "Meditation",
    img: "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Night City", desc: "Urban · Distant · Dreamy", badge: "Ambient",
    img: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Desert Wind", desc: "Warm · Vast · Timeless", badge: "Journey",
    img: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Northern Lights", desc: "Celestial · Mystical · Serene", badge: "Premium",
    img: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=600&q=80",
  },
];

const TESTIMONIALS = [
  {
    stars: 5, featured: true,
    text: `"I've tried every meditation app. AmbiVerse is different. The layered soundscapes actually transport you — I can study for 4 hours straight now without breaking focus."`,
    name: "Sarah M.", role: "PhD Student, Berlin", avatar: "S", color: "from-teal-400 to-cyan-400",
  },
  {
    stars: 5,
    text: `"The Cosmic Drift soundscape helped me through the worst insomnia of my life. Now I fall asleep in under 10 minutes every night."`,
    name: "Kai L.", role: "Designer, Amsterdam", avatar: "K", color: "from-violet-400 to-purple-500",
  },
  {
    stars: 5,
    text: `"As a meditation teacher, I recommend AmbiVerse to all my students. The binaural beats are perfectly tuned. This is premium sound design."`,
    name: "Priya K.", role: "Yoga Instructor, London", avatar: "P", color: "from-emerald-400 to-teal-500",
  },
];

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-b border-white/6 py-4">
      <div style={{ display: "flex", gap: 48, animation: "ticker 22s linear infinite", width: "max-content" }}>
        {items.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#c9a96e", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#5a5550" }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "24px 48px", padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      {TRUST.map((t, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", background: "linear-gradient(135deg, #c9a96e, #d4756b, #9b7ec8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t.number}</span>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: "#5a5550" }}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function SoundscapeCard({ s, i }) {
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
      <img
        src={s.img}
        alt={s.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}>
        {s.badge}
      </span>
      <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
        <div className="text-base font-bold text-white tracking-tight">{s.name}</div>
        <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>{s.desc}</div>
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
          <div className="text-base mb-5" style={{ color: "#1D9E75", letterSpacing: 3 }}>{stars}</div>
          <p className="text-base sm:text-lg leading-relaxed italic mb-8" style={{ color: "#8B9A9D" }}>{t.text}</p>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${t.color} text-white`}>{t.avatar}</div>
            <div>
              <div className="text-sm font-bold text-white">{t.name}</div>
              <div className="text-xs" style={{ color: "#4A5568" }}>{t.role}</div>
            </div>
          </div>
        </div>
        <div className="relative hidden sm:flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0F1F1C, #1A2F3A)", minHeight: 200 }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 60% 40%, rgba(29,158,117,0.15), transparent 70%)" }} />
          <span className="text-6xl opacity-30">🎧</span>
          <span className="absolute bottom-4 left-4 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.6)" }}>Flow state achieved</span>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
      className="rounded-3xl p-8 border border-white/8 hover:border-amber-500/20 transition-all duration-300"
      style={{ background: "#1a1a1a" }}
    >
      <div className="text-sm mb-4" style={{ color: "#1D9E75", letterSpacing: 3 }}>{stars}</div>
      <p className="text-sm leading-relaxed italic mb-6" style={{ color: "#8B9A9D" }}>{t.text}</p>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${t.color} text-white`}>{t.avatar}</div>
        <div>
          <div className="text-sm font-bold text-white">{t.name}</div>
          <div className="text-xs" style={{ color: "#5a5550" }}>{t.role}</div>
        </div>
      </div>
    </motion.div>
  );
}

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
      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes floatOrb { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(20px,-30px) scale(1.05);} 66%{transform:translate(-15px,20px) scale(.95);} }
      `}</style>

      <Ticker />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden" style={{ paddingTop: 64 }}>
        <HeroOrb />
        
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(29,158,117,0.08), transparent 70%)" }}>
          <div className="absolute w-[700px] h-[700px] rounded-full" style={{ top: -100, right: -150, background: "radial-gradient(circle, rgba(107,79,187,0.12), transparent 70%)", filter: "blur(100px)", animation: "floatOrb 12s ease-in-out infinite" }} />
          <div className="absolute w-[500px] h-[500px] rounded-full" style={{ bottom: -50, left: -100, background: "radial-gradient(circle, rgba(29,158,117,0.1), transparent 70%)", filter: "blur(100px)", animation: "floatOrb 12s ease-in-out infinite", animationDelay: "-4s" }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-xs font-semibold tracking-widest uppercase" style={{ background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.25)", color: "#1D9E75" }}>
            <Volume2 className="w-3 h-3 animate-pulse" />
            Powered by Spatial Audio
          </div>

          <h1 className="font-bold leading-[1.05] mb-6" style={{ fontSize: "clamp(46px, 7vw, 88px)", letterSpacing: "-3px" }}>
            Sound that{" "}
            <span style={{ background: "linear-gradient(135deg, #1D9E75 0%, #6B4FBB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              transforms
            </span>
            {" "}space
          </h1>

          <p className="mb-12 max-w-2xl mx-auto leading-relaxed" style={{ fontSize: "clamp(16px, 2vw, 20px)", color: "#8B9A9D" }}>
            Curated ambient soundscapes, binaural beats, and AI-generated sonic environments. For focus, sleep, meditation, and flow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={handleStart}
              className="group flex items-center gap-2 font-semibold transition-all duration-300"
              style={{ background: "linear-gradient(135deg, #1D9E75, #16B891)", color: "#0A0A12", fontSize: 16, padding: "16px 36px", borderRadius: 100, boxShadow: "0 8px 32px rgba(29,158,117,0.4)" }}
            >
              <Play className="w-4 h-4" />
              Start listening free
            </button>
            <button
              className="flex items-center gap-2 font-medium text-base transition-all duration-300 hover:bg-white/5"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", padding: "15px 28px", borderRadius: 100 }}
            >
              <Volume2 className="w-4 h-4" />
              Explore sounds
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#4A5568" }}>
              <span style={{ color: "#1D9E75" }}>★★★★★</span> 4.9 rating
            </div>
            <div className="w-px h-4 hidden sm:block" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-sm" style={{ color: "#4A5568" }}>50,000+ active listeners</div>
            <div className="w-px h-4 hidden sm:block" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-sm" style={{ color: "#4A5568" }}>Free forever</div>
          </div>
        </motion.div>
      </section>



      <TrustBar />

      {/* How It Works */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
            <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#1D9E75" }}>How It Works</div>
            <h2 className="font-bold leading-tight mb-5" style={{ fontSize: "clamp(32px, 4vw, 56px)", letterSpacing: "-2px" }}>Enter the sonic<br />universe</h2>
            <p className="text-lg max-w-md" style={{ color: "#8B9A9D" }}>Three steps to transform your environment through sound.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 rounded-3xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} viewport={{ once: true }}
                className="p-10 group transition-colors duration-300 hover:bg-white/[0.03]"
                style={{ borderRight: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : undefined }}
              >
                <div className="text-6xl font-black mb-8 leading-none" style={{ letterSpacing: "-4px", background: "linear-gradient(180deg, rgba(29,158,117,0.35), rgba(29,158,117,0.04))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.n}</div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)" }}>{s.icon}</div>
                <div className="text-lg font-bold mb-3 tracking-tight">{s.title}</div>
                <div className="text-sm leading-relaxed" style={{ color: "#8B9A9D" }}>{s.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Soundscapes */}
      <section className="py-28 px-6" style={{ background: "#0D0D0F", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#1D9E75" }}>Sound Library</div>
              <h2 className="font-bold leading-tight" style={{ fontSize: "clamp(32px, 4vw, 52px)", letterSpacing: "-2px" }}>200+ curated<br />environments</h2>
            </motion.div>
            <button className="text-sm font-medium flex-shrink-0 px-5 py-3 rounded-full transition-all duration-300 hover:border-white/20 hover:text-white" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              Browse all →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SOUNDSCAPES.map((s, i) => <SoundscapeCard key={s.name} s={s} i={i} />)}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-14">
            <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#1D9E75" }}>Loved by listeners</div>
            <h2 className="font-bold leading-tight" style={{ fontSize: "clamp(32px, 4vw, 52px)", letterSpacing: "-2px" }}>Real people, real focus</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => <TestimonialCard key={i} t={t} i={i} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 px-6 text-center relative overflow-hidden" style={{ background: "#0D0D0F", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(29,158,117,0.08), transparent 70%)" }} />
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative z-10 max-w-3xl mx-auto">
          <div className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: "#1D9E75" }}>Start Today — Free Forever</div>
          <h2 className="font-bold mb-6" style={{ fontSize: "clamp(36px, 5vw, 72px)", letterSpacing: "-2.5px", lineHeight: 1.08 }}>
            Your sanctuary is{" "}
            <span style={{ background: "linear-gradient(135deg, #1D9E75, #6B4FBB)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              one sound away
            </span>
          </h2>
          <p className="mb-12 text-lg" style={{ color: "#8B9A9D" }}>No credit card. No downloads. Just pure, immersive sound.</p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 font-semibold transition-all duration-300 hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #1D9E75, #16B891)", color: "#0A0A12", fontSize: 18, padding: "20px 44px", borderRadius: 100, boxShadow: "0 8px 32px rgba(29,158,117,0.4)" }}
          >
            <Play className="w-5 h-5" />
            Enter AmbiVerse →
          </button>
        </motion.div>
      </section>

      {/* Auth Modal */}
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
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg, #1D9E75, #6B4FBB)" }}>
                <Volume2 className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Start listening for free</h2>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                Create a free account to access 200+ soundscapes, save your favorites, and build custom ambient mixes.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full font-semibold py-3.5 rounded-2xl text-sm hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #1D9E75, #16B891)", color: "#0A0A12" }}
                >
                  Sign up — it's free
                </button>
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full font-medium py-3.5 rounded-2xl text-sm hover:bg-white/10 transition-all"
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