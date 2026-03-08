import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowRight, Sparkles, ShoppingBag, Recycle, X, Camera, Zap, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const HERO_CARDS = [
  { url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=360&q=80",  label: "Mid-Century",   top: "12%", left: "2%",   rotate: -8, delay: 0    },
  { url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=360&q=80", label: "Modern Minimal", top: "8%",  right: "2%",  rotate: 7,  delay: 0.2  },
  { url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=360&q=80", label: "Japandi",        bottom: "14%", left: "3%", rotate: 5, delay: 0.4  },
  { url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=360&q=80", label: "Boho",           bottom: "10%", right: "3%", rotate: -5, delay: 0.6 },
];

const STYLES = [
  { name: "Japandi",            url: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80", desc: "Calm. Natural. Intentional."   },
  { name: "Industrial",         url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",   desc: "Raw. Bold. Unfinished."         },
  { name: "Boho",               url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80", desc: "Layered. Textured. Wanderlust." },
  { name: "Modern Minimal",     url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80", desc: "Clean. Purposeful. Airy."      },
  { name: "Cottagecore",        url: "https://images.unsplash.com/photo-1513519245088-0e12902e35a6?w=600&q=80", desc: "Soft. Nostalgic. Cozy."         },
  { name: "Mid-Century Modern", url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",   desc: "Iconic. Warm. Timeless."        },
  { name: "Art Deco",           url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80", desc: "Glamorous. Geometric. Bold."   },
  { name: "Scandi",             url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80", desc: "Functional. Pure. Light."       },
];

const HOW_STEPS = [
  { num: "01", title: "Take a photo",      desc: "Snap your room from your phone or upload an existing photo. No special equipment needed.",                                    icon: Camera,      color: "from-violet-500 to-purple-600"  },
  { num: "02", title: "AI reimagines it",  desc: "Pick your style, mood, and budget. Our AI generates a photorealistic redesign in under 60 seconds.",                         icon: Sparkles,    color: "from-pink-500 to-rose-600"       },
  { num: "03", title: "Shop every piece",  desc: "Every item in the render is matched to real Amazon products. Add to cart and you're done.",                                  icon: ShoppingBag, color: "from-amber-500 to-orange-600"    },
];

const FEATURES = [
  { icon: Zap,       color: "bg-violet-500/15 text-violet-400", title: "60-second renders",        desc: "Your AI design is ready before your coffee gets cold. Stable Diffusion, tuned for interiors." },
  { icon: ShoppingBag, color: "bg-amber-500/15 text-amber-400",  title: "Every piece is shoppable", desc: "AI detects each item in the render and finds the closest real product on Amazon — filtered to your budget." },
  { icon: Recycle,   color: "bg-emerald-500/15 text-emerald-400", title: "Pre-loved mode",          desc: "Toggle sustainability mode for thrift and second-hand alternatives. Beautiful design, lighter footprint." },
  { icon: Camera,    color: "bg-pink-500/15 text-pink-400",      title: "Shoot, don't scan",        desc: "Just snap a photo from your phone. No 3D scans, no floor plans, no hassle." },
];

export default function Home() {
  const [user, setUser] = useState(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleStartDesigning = () => {
    if (user) navigate(createPageUrl("Studio"));
    else setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-[#080809] text-white overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">

        {/* Animated ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-violet-600 rounded-full blur-[150px]"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.07, 0.14, 0.07] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute top-1/2 left-1/5 w-[500px] h-[500px] bg-pink-600 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 5 }}
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-500 rounded-full blur-[130px]"
          />
        </div>

        {/* Floating room cards — desktop only */}
        <div className="absolute inset-0 pointer-events-none hidden xl:block">
          {HERO_CARDS.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: card.delay + 0.8, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ position: "absolute", top: card.top, left: card.left, right: card.right, bottom: card.bottom }}
            >
              <motion.div
                animate={{ y: [0, -14, 0] }}
                transition={{ delay: card.delay + 1.5, duration: 5 + i * 0.7, repeat: Infinity, ease: "easeInOut" }}
                style={{ rotate: card.rotate }}
              >
                <div className="w-52 rounded-2xl overflow-hidden border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-white/5 backdrop-blur-sm">
                  <img src={card.url} alt={card.label} className="w-full h-36 object-cover" />
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400" />
                    <span className="text-xs text-white/60 font-medium">{card.label}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-white/6 border border-white/12 rounded-full px-4 py-1.5 text-xs text-white/55 mb-10 backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Interior Design — Free to Start
          </motion.div>

          <h1 className="text-[clamp(3rem,9vw,6.5rem)] font-black leading-[0.92] tracking-[-0.03em] mb-7">
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="block text-white"
            >
              Your room.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              className="block bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent"
            >
              Reimagined by AI.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="block text-white/25"
            >
              Ready to shop.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="text-base sm:text-lg text-white/45 max-w-xl mx-auto leading-relaxed mb-10"
          >
            Upload a photo of any room. Pick a style. Watch AI redesign it in 60 seconds — then buy every piece from Amazon with one tap.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: "0 0 60px rgba(139,92,246,0.5)" }}
              whileTap={{ scale: 0.96 }}
              onClick={handleStartDesigning}
              className="group flex items-center gap-2 bg-white text-black font-black px-9 py-4 rounded-2xl text-sm shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-shadow"
            >
              Start designing free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={createPageUrl("Projects")}
                className="flex items-center gap-2 bg-white/6 border border-white/12 text-white/65 font-medium px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-sm backdrop-blur-sm"
              >
                View my projects
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="mt-10 flex items-center justify-center gap-6 text-xs text-white/30"
          >
            {["No credit card", "Free AI renders", "Real products"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-500" /> {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-16 bg-gradient-to-b from-white/0 via-white/25 to-white/0 mx-auto"
          />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-6 py-32 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-violet-400 font-bold mb-4">How it works</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Three steps.<br />One perfect room.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOW_STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              viewport={{ once: true }}
            >
              <div className="relative bg-white/[0.03] border border-white/8 rounded-3xl p-8 h-full overflow-hidden group hover:border-white/15 hover:bg-white/[0.045] transition-all duration-500">
                {/* Ghost number */}
                <div className="absolute -top-3 -right-1 text-[8rem] font-black text-white/[0.035] leading-none select-none pointer-events-none">
                  {s.num}
                </div>
                <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-3 relative">{s.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed relative">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── STYLE GALLERY ── */}
      <section className="py-24 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 px-6"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-violet-400 font-bold mb-4">Design styles</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight">8 worlds to explore</h2>
          <p className="text-white/35 mt-3 text-base">Each powered by a dedicated fine-tuned AI model</p>
        </motion.div>

        {/* Horizontal scroll gallery */}
        <div
          className="flex gap-4 overflow-x-auto pb-6 px-6 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {STYLES.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, scale: 0.88 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="flex-none w-60 sm:w-68 snap-start cursor-pointer group"
              onClick={handleStartDesigning}
            >
              <div className="relative h-80 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src={s.url}
                  alt={s.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="font-bold text-lg mb-0.5">{s.name}</div>
                  <div className="text-white/50 text-xs">{s.desc}</div>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                  <div className="bg-white text-black text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                    Try →
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-violet-400 font-bold mb-4">Why Ambient</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Built different.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex gap-5 items-start bg-white/[0.025] border border-white/8 rounded-3xl p-7 hover:border-white/14 hover:bg-white/[0.04] transition-all duration-400"
            >
              <div className={`flex-none w-11 h-11 rounded-2xl ${f.color} flex items-center justify-center`}>
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                <p className="text-white/38 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-6 py-36 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/30 to-transparent" />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-700 rounded-full blur-[130px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-2xl mx-auto"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-violet-400 font-bold mb-7">Start free today</p>
          <h2 className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.92] mb-7">
            From idea<br />
            to{" "}
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              fully furnished
            </span>
            <br />in 5 minutes.
          </h2>
          <p className="text-white/35 mb-10 text-base">No design skills. No app to install. Just your phone and a vision.</p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 90px rgba(139,92,246,0.55)" }}
            whileTap={{ scale: 0.96 }}
            onClick={handleStartDesigning}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black px-12 py-5 rounded-2xl text-base shadow-[0_0_50px_rgba(139,92,246,0.35)] transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Open the Studio — free
          </motion.button>
        </motion.div>
      </section>

      {/* ── AUTH MODAL ── */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-lg"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 32 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-[#111114] border border-white/12 rounded-3xl p-8 text-center shadow-2xl"
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-white/25 hover:text-white/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <motion.div
                animate={{ boxShadow: ["0 0 30px rgba(139,92,246,0.3)", "0 0 60px rgba(139,92,246,0.5)", "0 0 30px rgba(139,92,246,0.3)"] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-6"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-black mb-2">Design your first room</h2>
              <p className="text-white/40 text-sm mb-8 leading-relaxed">
                Free account. Instant AI renders. Real products to shop.
              </p>
              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black py-3.5 rounded-2xl text-sm"
                >
                  Sign up free
                </motion.button>
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full bg-white/5 border border-white/10 text-white/55 font-medium py-3.5 rounded-2xl hover:bg-white/10 transition-all text-sm"
                >
                  I already have an account
                </button>
              </div>
              <div className="mt-6 flex items-center justify-center gap-5 text-xs text-white/25">
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> No credit card</span>
                <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Free to use</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}