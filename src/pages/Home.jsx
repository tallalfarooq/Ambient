import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X, Upload, Palette, ShoppingBag, Sparkles, ArrowRight, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import Room3DShowcase from "@/components/home/Room3DShowcase";
import HeroSlider from "@/components/home/HeroSlider";

/* ─── Data ──────────────────────────────────────────────────────────────── */

const TICKER_ITEMS = [
  "Japandi Design",
  "Modern Minimal",
  "AI-Powered",
  "Boho Chic",
  "Industrial Loft",
  "Scandinavian",
  "Mid-Century Modern",
  "Shop the Look",
];

const TRUST = [
  { number: "10K+", label: "Rooms Designed" },
  { number: "8",    label: "Design Styles"  },
  { number: "AI",   label: "Powered"        },
  { number: "4.9★", label: "User Rating"    },
  { number: "Free", label: "To Start"       },
];

const STEPS = [
  {
    n: "01",
    Icon: Upload,
    title: "Upload Your Room",
    desc: "Take a photo of any room. Our AI analyzes the space, dimensions, and existing layout in seconds.",
  },
  {
    n: "02",
    Icon: Palette,
    title: "Choose Your Style",
    desc: "Pick from 8 curated interior design styles, color palettes, and vibe tags tailored to your taste.",
  },
  {
    n: "03",
    Icon: ShoppingBag,
    title: "Shop Your Vision",
    desc: "AI detects every piece of furniture in your generated render. Click any item to shop on Amazon, IKEA, and more.",
  },
];

const STYLES = [
  {
    name: "Japandi",
    desc: "Minimal · Organic · Serene",
    badge: "Most Popular",
    img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Modern Minimal",
    desc: "Clean · Bold · Functional",
    badge: "Trending",
    img: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Industrial",
    desc: "Raw · Urban · Textured",
    badge: "Bold",
    img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Boho Chic",
    desc: "Warm · Layered · Earthy",
    badge: "Cozy",
    img: "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Scandinavian",
    desc: "Light · Airy · Functional",
    badge: "Clean",
    img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Mid-Century",
    desc: "Retro · Warm · Timeless",
    badge: "Classic",
    img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Art Deco",
    desc: "Glamorous · Bold · Geometric",
    badge: "Premium",
    img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Cottagecore",
    desc: "Romantic · Soft · Natural",
    badge: "Dreamy",
    img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80",
  },
];

const TESTIMONIALS = [
  {
    stars: 5,
    featured: true,
    text: `"I redesigned my entire living room in 20 minutes. The Japandi style the AI generated was exactly what I'd been dreaming of for years — and every furniture piece had a shopping link."`,
    name: "Sarah M.",
    role: "Homeowner, Berlin",
    avatar: "S",
    color: "from-teal-400 to-cyan-400",
  },
  {
    stars: 5,
    text: `"Used Ambient for our entire office renovation. Saved 3 weeks of planning. The furniture recommendations from AI were remarkably accurate and affordable."`,
    name: "Kai L.",
    role: "Startup Founder, Amsterdam",
    avatar: "K",
    color: "from-violet-400 to-purple-500",
  },
  {
    stars: 5,
    text: `"Finally an AI that truly understands interior design. The style consistency is incredible, and the before/after comparison feature blew every client away."`,
    name: "Priya K.",
    role: "Interior Designer, London",
    avatar: "P",
    color: "from-emerald-400 to-teal-500",
  },
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-b border-white/6 py-4">
      <div
        style={{
          display: "flex",
          gap: 48,
          animation: "ticker 26s linear infinite",
          width: "max-content",
        }}
      >
        {items.map((t, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#c9a96e",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#5a5550",
              }}
            >
              {t}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBar() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px 48px",
        padding: "40px 24px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {TRUST.map((t, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-1px",
              background: "linear-gradient(135deg, #c9a96e, #d4756b, #9b7ec8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t.number}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.05em",
              color: "#5a5550",
            }}
          >
            {t.label}
          </span>
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
      <img
        src={s.img}
        alt={s.name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      <span
        className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff",
        }}
      >
        {s.badge}
      </span>
      <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
        <div className="text-base font-bold text-white tracking-tight">
          {s.name}
        </div>
        <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
          {s.desc}
        </div>
      </div>
    </motion.div>
  );
}

function TestimonialCard({ t, i }) {
  const stars = "★".repeat(t.stars);
  if (t.featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        viewport={{ once: true }}
        className="col-span-1 sm:col-span-2 lg:col-span-3 rounded-3xl overflow-hidden border border-white/8 grid sm:grid-cols-2"
        style={{ background: "#1a1a1a" }}
      >
        <div className="p-8 sm:p-12">
          <div
            className="text-base mb-5"
            style={{ color: "#1D9E75", letterSpacing: 3 }}
          >
            {stars}
          </div>
          <p
            className="text-base sm:text-lg leading-relaxed italic mb-8"
            style={{ color: "#8B9A9D" }}
          >
            {t.text}
          </p>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${t.color} text-white`}
            >
              {t.avatar}
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t.name}</div>
              <div className="text-xs" style={{ color: "#4A5568" }}>
                {t.role}
              </div>
            </div>
          </div>
        </div>
        <div
          className="relative hidden sm:flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0F1F1C, #1A2F3A)",
            minHeight: 200,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 60% 40%, rgba(29,158,117,0.15), transparent 70%)",
            }}
          />
          <Layers className="w-16 h-16 opacity-10 text-teal-400" />
          <span
            className="absolute bottom-4 left-4 text-[11px] font-semibold px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Redesigned in 20 min ✦
          </span>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1 }}
      viewport={{ once: true }}
      className="rounded-3xl p-8 border border-white/8 hover:border-amber-500/20 transition-all duration-300"
      style={{ background: "#1a1a1a" }}
    >
      <div className="text-sm mb-4" style={{ color: "#1D9E75", letterSpacing: 3 }}>
        {stars}
      </div>
      <p
        className="text-sm leading-relaxed italic mb-6"
        style={{ color: "#8B9A9D" }}
      >
        {t.text}
      </p>
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${t.color} text-white`}
        >
          {t.avatar}
        </div>
        <div>
          <div className="text-sm font-bold text-white">{t.name}</div>
          <div className="text-xs" style={{ color: "#5a5550" }}>
            {t.role}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

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
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "#0A0A0B" }}
    >
      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes floatOrb {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(20px,-30px) scale(1.05); }
          66%      { transform: translate(-15px,20px) scale(.95); }
        }
      `}</style>

      <Ticker />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative flex items-center min-h-screen overflow-hidden"
        style={{ paddingTop: 0 }}
      >
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-[700px] h-[700px] rounded-full"
            style={{
              top: -100,
              left: -200,
              background:
                "radial-gradient(circle, rgba(29,158,117,0.1), transparent 70%)",
              filter: "blur(100px)",
              animation: "floatOrb 14s ease-in-out infinite",
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              bottom: -50,
              left: "20%",
              background:
                "radial-gradient(circle, rgba(107,79,187,0.1), transparent 70%)",
              filter: "blur(100px)",
              animation: "floatOrb 14s ease-in-out infinite",
              animationDelay: "-5s",
            }}
          />
        </div>

        {/* Left — text */}
        <div className="relative z-10 w-full lg:w-1/2 px-8 sm:px-16 py-24 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-xs font-semibold tracking-widest uppercase"
              style={{
                background: "rgba(29,158,117,0.12)",
                border: "1px solid rgba(29,158,117,0.25)",
                color: "#1D9E75",
              }}
            >
              <Sparkles className="w-3 h-3" />
              AI-Powered Interior Design
            </div>

            {/* Headline */}
            <h1
              className="font-bold leading-[1.05] mb-6"
              style={{
                fontSize: "clamp(40px, 5.5vw, 76px)",
                letterSpacing: "-3px",
              }}
            >
              Redesign your{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #1D9E75 0%, #6B4FBB 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                space
              </span>
              <br />
              in minutes
            </h1>

            <p
              className="mb-10 max-w-lg leading-relaxed"
              style={{
                fontSize: "clamp(15px, 1.6vw, 18px)",
                color: "#8B9A9D",
              }}
            >
              Upload a photo of any room. Choose your style. Our AI generates a
              photorealistic redesign and finds every piece of furniture for you
              to shop instantly.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
              <button
                onClick={handleStart}
                className="group flex items-center gap-2.5 font-semibold transition-all duration-300 hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #1D9E75, #16B891)",
                  color: "#0A0A12",
                  fontSize: 16,
                  padding: "16px 36px",
                  borderRadius: 100,
                  boxShadow: "0 8px 32px rgba(29,158,117,0.4)",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Start Designing Free
              </button>
              <button
                onClick={handleStart}
                className="flex items-center gap-2 font-medium text-sm transition-all duration-300 hover:bg-white/5"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  padding: "15px 26px",
                  borderRadius: 100,
                }}
              >
                See Examples
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: "#4A5568" }}
              >
                <span style={{ color: "#1D9E75" }}>★★★★★</span> 4.9 rating
              </div>
              <div
                className="w-px h-4 hidden sm:block"
                style={{ background: "rgba(255,255,255,0.1)" }}
              />
              <div className="text-sm" style={{ color: "#4A5568" }}>
                10,000+ rooms transformed
              </div>
              <div
                className="w-px h-4 hidden sm:block"
                style={{ background: "rgba(255,255,255,0.1)" }}
              />
              <div className="text-sm" style={{ color: "#4A5568" }}>
                Free forever
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right — 3D Room */}
        <div
          className="hidden lg:block absolute right-0 top-0 bottom-0"
          style={{ width: "52%" }}
        >
          <Room3DShowcase />
        </div>
      </section>

      <TrustBar />

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div
              className="text-xs font-bold tracking-widest uppercase mb-4"
              style={{ color: "#1D9E75" }}
            >
              How It Works
            </div>
            <h2
              className="font-bold leading-tight mb-5"
              style={{
                fontSize: "clamp(32px, 4vw, 56px)",
                letterSpacing: "-2px",
              }}
            >
              From photo to{" "}
              <br />
              dream room
            </h2>
            <p className="text-lg max-w-md" style={{ color: "#8B9A9D" }}>
              Three steps to transform any space with AI.
            </p>
          </motion.div>

          <div
            className="grid grid-cols-1 sm:grid-cols-3 rounded-3xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                viewport={{ once: true }}
                className="p-10 group transition-colors duration-300 hover:bg-white/[0.03]"
                style={{
                  borderRight:
                    i < STEPS.length - 1
                      ? "1px solid rgba(255,255,255,0.07)"
                      : undefined,
                }}
              >
                <div
                  className="text-6xl font-black mb-8 leading-none"
                  style={{
                    letterSpacing: "-4px",
                    background:
                      "linear-gradient(180deg, rgba(29,158,117,0.35), rgba(29,158,117,0.04))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {s.n}
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                  style={{
                    background: "rgba(29,158,117,0.1)",
                    border: "1px solid rgba(29,158,117,0.25)",
                  }}
                >
                  <s.Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-lg font-bold mb-3 tracking-tight">
                  {s.title}
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "#8B9A9D" }}
                >
                  {s.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ────────────────────────────────────────────────── */}
      <section
        id="transformation"
        className="py-28 px-6"
        style={{
          background: "#0D0D0F",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div
                className="text-xs font-bold tracking-widest uppercase mb-4"
                style={{ color: "#1D9E75" }}
              >
                Transformation
              </div>
              <h2
                className="font-bold leading-tight"
                style={{
                  fontSize: "clamp(32px, 4vw, 52px)",
                  letterSpacing: "-2px",
                }}
              >
                See the difference
                <br />
                AI makes
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-base max-w-sm lg:text-right"
              style={{ color: "#8B9A9D" }}
            >
              Drag the slider to reveal the AI-generated interior. Every item
              in the render is shoppable.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <HeroSlider />
          </motion.div>
        </div>
      </section>

      {/* ── Style Showcase ────────────────────────────────────────────────── */}
      <section id="styles" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div
                className="text-xs font-bold tracking-widest uppercase mb-4"
                style={{ color: "#1D9E75" }}
              >
                Design Styles
              </div>
              <h2
                className="font-bold leading-tight"
                style={{
                  fontSize: "clamp(32px, 4vw, 52px)",
                  letterSpacing: "-2px",
                }}
              >
                8 curated
                <br />
                aesthetics
              </h2>
            </motion.div>
            <button
              onClick={handleStart}
              className="text-sm font-medium flex-shrink-0 px-5 py-3 rounded-full transition-all duration-300 hover:border-white/20 hover:text-white"
              style={{
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Try all styles →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STYLES.map((s, i) => (
              <StyleCard key={s.name} s={s} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section
        id="testimonials"
        className="py-28 px-6"
        style={{
          background: "#0D0D0F",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <div
              className="text-xs font-bold tracking-widest uppercase mb-4"
              style={{ color: "#1D9E75" }}
            >
              Loved by designers
            </div>
            <h2
              className="font-bold leading-tight"
              style={{
                fontSize: "clamp(32px, 4vw, 52px)",
                letterSpacing: "-2px",
              }}
            >
              Real rooms, real results
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={i} t={t} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section
        id="cta"
        className="py-40 px-6 text-center relative overflow-hidden"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          background: "#0A0A0B",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(29,158,117,0.08), transparent 70%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <div
            className="text-xs font-bold tracking-widest uppercase mb-5"
            style={{ color: "#1D9E75" }}
          >
            Free Forever
          </div>
          <h2
            className="font-bold mb-6"
            style={{
              fontSize: "clamp(36px, 5vw, 72px)",
              letterSpacing: "-2.5px",
              lineHeight: 1.08,
            }}
          >
            Transform your first{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #1D9E75, #6B4FBB)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              room today
            </span>
          </h2>
          <p className="mb-12 text-lg" style={{ color: "#8B9A9D" }}>
            No credit card. No downloads. Upload a photo and watch AI redesign
            your space.
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 font-semibold transition-all duration-300 hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #1D9E75, #16B891)",
              color: "#0A0A12",
              fontSize: 18,
              padding: "20px 44px",
              borderRadius: 100,
              boxShadow: "0 8px 32px rgba(29,158,117,0.4)",
            }}
          >
            <Sparkles className="w-5 h-5" />
            Start Designing Free →
          </button>
        </motion.div>
      </section>

      {/* ── Auth Modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl p-8 text-center shadow-2xl"
              style={{
                background: "#111114",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{
                  background: "linear-gradient(135deg, #1D9E75, #6B4FBB)",
                }}
              >
                <Layers className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">Start designing for free</h2>
              <p
                className="text-sm mb-8 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Create a free account to access the AI studio, save your designs,
                and shop furniture from your renders.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() =>
                    base44.auth.redirectToLogin(
                      window.location.origin + createPageUrl("Studio")
                    )
                  }
                  className="w-full font-semibold py-3.5 rounded-2xl text-sm hover:opacity-90 transition-opacity"
                  style={{
                    background: "linear-gradient(135deg, #1D9E75, #16B891)",
                    color: "#0A0A12",
                  }}
                >
                  Sign up — it's free
                </button>
                <button
                  onClick={() =>
                    base44.auth.redirectToLogin(
                      window.location.origin + createPageUrl("Studio")
                    )
                  }
                  className="w-full font-medium py-3.5 rounded-2xl text-sm hover:bg-white/10 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  Sign in to existing account
                </button>
              </div>
              <p
                className="text-xs mt-6"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                No credit card required. Free to use.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}