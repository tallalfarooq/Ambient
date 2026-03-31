import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X, Upload, Palette, ShoppingBag, Sparkles, ArrowRight, Layers } from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { base44 } from "@/api/base44Client";
import RoomVideoShowcase from "@/components/home/RoomVideoShowcase";
import HeroSlider from "@/components/home/HeroSlider";
import { useLanguage } from "@/lib/LanguageContext";

/* ─── Static data ────────────────────────────────────────────────────────── */

const STYLES = [
  { name: "Japandi",        desc: "Minimal · Organic · Serene",    badge: "Most Popular", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80" },
  { name: "Modern Minimal", desc: "Clean · Bold · Functional",     badge: "Trending",     img: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=600&q=80" },
  { name: "Industrial",     desc: "Raw · Urban · Textured",        badge: "Bold",         img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80" },
  { name: "Boho Chic",      desc: "Warm · Layered · Earthy",       badge: "Cozy",         img: "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=600&q=80" },
  { name: "Scandinavian",   desc: "Light · Airy · Functional",     badge: "Clean",        img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80" },
  { name: "Mid-Century",    desc: "Retro · Warm · Timeless",       badge: "Classic",      img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80" },
  { name: "Art Deco",       desc: "Glamorous · Bold · Geometric",  badge: "Premium",      img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=600&q=80" },
  { name: "Cottagecore",    desc: "Romantic · Soft · Natural",     badge: "Dreamy",       img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80" },
];

const TESTIMONIALS = [
  {
    stars: 5, featured: true,
    text: `"I redesigned my entire living room in 20 minutes. The Japandi style ambientspace.ai generated was exactly what I'd been dreaming of for years — and every furniture piece had a shopping link."`,
    name: "Sarah M.", role: "Homeowner, Berlin", avatar: "S", color: "from-sky-400 to-teal-500",
  },
  {
    stars: 5,
    text: `"Used AmbientSpace for our entire office renovation. Saved 3 weeks of planning. The furniture recommendations from AI were remarkably accurate and affordable."`,
    name: "Kai L.", role: "Startup Founder, Amsterdam", avatar: "K", color: "from-violet-400 to-purple-500",
  },
  {
    stars: 5,
    text: `"Finally an AI that truly understands interior design. ambientspace.ai's style consistency is incredible, and the before/after comparison blew every client away."`,
    name: "Priya K.", role: "Interior Designer, London", avatar: "P", color: "from-amber-400 to-orange-500",
  },
];

/* ─── Animation helpers ──────────────────────────────────────────────────── */

function AnimatedCounter({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const numMatch = value.match(/(\d+)/);
    if (!numMatch) { setDisplay(value); return; }
    const end = parseInt(numMatch[1]);
    const prefix = value.slice(0, numMatch.index);
    const suffix = value.slice(numMatch.index + numMatch[1].length);
    let start = 0;
    const total = 1400;
    const steps = 60;
    const inc = Math.ceil(end / steps);
    const iv = setInterval(() => {
      start = Math.min(start + inc, end);
      setDisplay(`${prefix}${start.toLocaleString()}${suffix}`);
      if (start >= end) clearInterval(iv);
    }, total / steps);
    return () => clearInterval(iv);
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

/* Word-by-word staggered reveal */
function WordReveal({ text, delay = 0, className = "", style = {} }) {
  const words = String(text).split(" ");
  return (
    <span className={className} style={{ ...style, display: "inline" }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * 0.09, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: "inline-block", marginRight: i < words.length - 1 ? "0.28em" : 0 }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Ticker() {
  const ITEMS = [
    "Japandi Design", "Modern Minimal", "AI-Powered", "Boho Chic",
    "Industrial Loft", "Scandinavian", "Mid-Century Modern", "Shop the Look",
    "Art Deco", "Cottagecore", "Instant Render", "Real Furniture",
  ];
  const items = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", gap: 44, animation: "ticker 32s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#C9963A", opacity: 0.5, display: "inline-block" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StyleCard({ s, i, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.5 }}
      viewport={{ once: true }}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className="relative rounded-3xl overflow-hidden cursor-pointer group flex-shrink-0"
      style={{ width: 210, height: 290, border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <img src={s.img} alt={s.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)" }} />
      <motion.span
        className="absolute top-3 right-3 text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}
      >{s.badge}</motion.span>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="text-sm font-bold text-white tracking-tight">{s.name}</div>
        <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{s.desc}</div>
      </div>
    </motion.div>
  );
}

function TestimonialCard({ t: item, i }) {
  const stars = "★".repeat(item.stars);
  if (item.featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="col-span-full rounded-3xl overflow-hidden grid sm:grid-cols-5"
        style={{ background: "linear-gradient(135deg, #131315, #1b1b1e)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="sm:col-span-3 p-8 sm:p-12 flex flex-col justify-between">
          <div>
            <div className="text-sm mb-5" style={{ color: "#C9963A", letterSpacing: 4 }}>{stars}</div>
            <p className="text-base sm:text-xl leading-relaxed mb-8 font-light" style={{ color: "rgba(255,255,255,0.72)" }}>{item.text}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${item.color} text-white`}>{item.avatar}</div>
            <div>
              <div className="text-sm font-bold text-white">{item.name}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>{item.role}</div>
            </div>
          </div>
        </div>
        <div className="sm:col-span-2 relative hidden sm:block" style={{ minHeight: 280 }}>
          <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=85&auto=format&fit=crop" alt="AI redesigned room" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(19,19,21,0.55), transparent 45%)" }} />
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
      className="rounded-3xl p-7 border transition-all duration-300"
      style={{ background: "linear-gradient(135deg, #131315, #1b1b1e)", borderColor: "rgba(255,255,255,0.06)" }}
      whileHover={{ borderColor: "rgba(201,150,58,0.18)", y: -2 }}
    >
      <div className="text-sm mb-4" style={{ color: "#C9963A", letterSpacing: 4 }}>{stars}</div>
      <p className="text-sm leading-relaxed mb-6 font-light" style={{ color: "rgba(255,255,255,0.58)" }}>{item.text}</p>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br ${item.color} text-white`}>{item.avatar}</div>
        <div>
          <div className="text-sm font-semibold text-white">{item.name}</div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.26)" }}>{item.role}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* Horizontal drag-scroll wrapper */
function DragScroll({ children, className = "" }) {
  const ref = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  return (
    <div
      ref={ref}
      className={className}
      style={{ overflowX: "auto", display: "flex", cursor: "grab", userSelect: "none" }}
      onMouseDown={(e) => {
        isDown.current = true;
        ref.current.style.cursor = "grabbing";
        startX.current = e.pageX - ref.current.offsetLeft;
        scrollLeft.current = ref.current.scrollLeft;
      }}
      onMouseLeave={() => { isDown.current = false; if (ref.current) ref.current.style.cursor = "grab"; }}
      onMouseUp={() => { isDown.current = false; if (ref.current) ref.current.style.cursor = "grab"; }}
      onMouseMove={(e) => {
        if (!isDown.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        ref.current.scrollLeft = scrollLeft.current - (x - startX.current) * 1.4;
      }}
    >
      {children}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function Home() {
  const [user, setUser] = useState(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleStart = () => {
    if (user) navigate(createPageUrl("Studio"));
    else setShowAuthModal(true);
  };

  const TRUST = [
    { number: "10K+", label: t("trust_rooms") },
    { number: "8",    label: t("trust_styles") },
    { number: "AI",   label: t("trust_ai") },
    { number: "4.9★", label: t("trust_rating") },
    { number: "Free", label: t("trust_free") },
  ];

  const STEPS = [
    {
      n: "01", Icon: Upload,
      title: t("step1_title"), desc: t("step1_desc"),
      img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=80",
      accent: "#1B8FA0", rgb: "27,143,160",
    },
    {
      n: "02", Icon: Palette,
      title: t("step2_title"), desc: t("step2_desc"),
      img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=700&q=80",
      accent: "#C9963A", rgb: "201,150,58",
    },
    {
      n: "03", Icon: ShoppingBag,
      title: t("step3_title"), desc: t("step3_desc"),
      img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80",
      accent: "#9B7EC8", rgb: "155,126,200",
    },
  ];

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#07070A" }}>
      <style>{`
        @keyframes ticker    { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes floatOrb  { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(26px,-38px) scale(1.07); } 66% { transform: translate(-18px,24px) scale(.93); } }
        @keyframes floatY    { 0%,100% { transform: translateY(0px); }  50% { transform: translateY(-10px); } }
        @keyframes shimmer   { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes rotateSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { scrollbar-width: none; }
        .dot-grid { background-image: radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px); background-size: 30px 30px; }
        .noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); }
      `}</style>

      <Ticker />

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.45 }} />
        <div className="absolute inset-0 noise pointer-events-none" />

        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position: "absolute", width: 900, height: 900, top: -250, left: -350, borderRadius: "50%", background: "radial-gradient(circle, rgba(27,143,160,0.13), transparent 65%)", filter: "blur(90px)", animation: "floatOrb 17s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 650, height: 650, bottom: -120, left: "25%", borderRadius: "50%", background: "radial-gradient(circle, rgba(201,150,58,0.07), transparent 65%)", filter: "blur(80px)", animation: "floatOrb 17s ease-in-out infinite", animationDelay: "-7s" }} />
          <div style={{ position: "absolute", width: 450, height: 450, top: "35%", right: "15%", borderRadius: "50%", background: "radial-gradient(circle, rgba(155,126,200,0.07), transparent 65%)", filter: "blur(60px)", animation: "floatOrb 22s ease-in-out infinite", animationDelay: "-12s" }} />
        </div>

        {/* ── LEFT: text content ── */}
        <div className="relative z-10 w-full lg:w-[54%] px-8 sm:px-14 lg:px-20 xl:px-24 flex flex-col justify-center py-28 lg:py-0">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2.5 rounded-full w-fit px-4 py-2 mb-10 text-[10px] font-bold tracking-[0.18em] uppercase"
            style={{ background: "rgba(27,143,160,0.07)", border: "1px solid rgba(27,143,160,0.22)", color: "#1B8FA0" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1B8FA0", display: "block", boxShadow: "0 0 10px rgba(27,143,160,0.9)" }} />
            {t("hero_badge")}
          </motion.div>

          {/* ── Headline — the signature cinematic treatment ── */}
          <h1 style={{ fontWeight: 800, letterSpacing: "-3px", lineHeight: 1.0, marginBottom: 28 }}>
            {/* Line 1: plain white animated words */}
            <span style={{ display: "block", fontSize: "clamp(40px, 5.8vw, 84px)", color: "#fff" }}>
              <WordReveal text={`${t("hero_title_1")} ${t("hero_title_2")}`} delay={0.1} />
            </span>

            {/* Line 2: "Space" — room image clips through the letterforms */}
            <motion.span
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: "block",
                fontSize: "clamp(56px, 8.5vw, 124px)",
                backgroundImage: "url('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=90')",
                backgroundSize: "160% 160%",
                backgroundPosition: "center 35%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "brightness(1.15) saturate(1.2)",
                lineHeight: 0.92,
              }}
            >
              {t("hero_title_3")}
            </motion.span>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58, duration: 0.6 }}
            style={{ fontSize: "clamp(14px, 1.45vw, 17px)", color: "rgba(255,255,255,0.4)", marginBottom: 40, maxWidth: 430, lineHeight: 1.75 }}
          >
            {t("hero_subtitle")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.68 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-12"
          >
            <button
              onClick={handleStart}
              className="group relative inline-flex items-center gap-2.5 font-bold overflow-hidden transition-all duration-300 hover:opacity-92 hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", color: "#07070A", fontSize: 15, padding: "16px 34px", borderRadius: 100, boxShadow: "0 0 40px rgba(27,143,160,0.28), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)" }}
            >
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              {t("hero_cta_primary")}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate(createPageUrl("Projects"))}
              className="inline-flex items-center gap-2 font-medium text-sm transition-all duration-300 hover:border-white/20 hover:text-white"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", padding: "15px 26px", borderRadius: 100 }}
            >
              {t("hero_cta_secondary")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>

          {/* Social proof row */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.82 }}
            className="flex flex-wrap items-center gap-4 sm:gap-5"
          >
            <div className="flex -space-x-2.5">
              {[["S","#1B8FA0"],["K","#C9963A"],["P","#9B7EC8"],["M","#1D9E75"]].map(([l, bg], i) => (
                <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: bg, border: "2px solid #07070A" }}>{l}</div>
              ))}
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
              <span style={{ color: "#C9963A" }}>★★★★★</span>&nbsp;&nbsp;{t("hero_social_rating")}
            </div>
            <div className="hidden sm:block w-px h-3.5" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>{t("hero_social_rooms")}</div>
          </motion.div>
        </div>

        {/* ── RIGHT: room video showcase ── */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0" style={{ width: "48%" }}>
          {/* Fade edge so it bleeds into text naturally */}
          <div className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none" style={{ width: 140, background: "linear-gradient(to right, #07070A, transparent)" }} />
          <RoomVideoShowcase />
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
          className="absolute bottom-8 left-8 hidden lg:flex flex-col items-center gap-2 pointer-events-none"
        >
          <div style={{ width: 1, height: 44, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.2))" }} />
          <span style={{ fontSize: 8, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", writingMode: "horizontal-tb" }}>Scroll</span>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TRUST BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-wrap items-center justify-center gap-10 sm:gap-16">
          {TRUST.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              className="flex flex-col items-center gap-1.5"
            >
              <span style={{ fontSize: "clamp(22px, 2.8vw, 34px)", fontWeight: 800, letterSpacing: "-1px", background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                <AnimatedCounter value={item.number} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)" }}>{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20 max-w-2xl">
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: "#1B8FA0" }}>{t("how_label")}</div>
            <h2 style={{ fontSize: "clamp(30px, 4.2vw, 58px)", fontWeight: 800, letterSpacing: "-2.5px", lineHeight: 1.06, marginBottom: 16 }}>
              {t("how_title_1")} <br />
              <span style={{ background: "linear-gradient(135deg, #1B8FA0 0%, #C9963A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {t("how_title_2")}
              </span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.38)", lineHeight: 1.72 }}>{t("how_subtitle")}</p>
          </motion.div>

          {/* Steps grid — each card has a room image top, text bottom */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12, duration: 0.6 }} viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group relative rounded-3xl overflow-hidden"
                style={{ border: "1px solid rgba(255,255,255,0.06)", background: "#0E0E12" }}
              >
                {/* Room photo */}
                <div className="relative overflow-hidden" style={{ height: 200 }}>
                  <img src={s.img} alt={s.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-107" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, #0E0E12 100%)" }} />
                  {/* Ghost step number over image */}
                  <span
                    className="absolute top-3 left-4 font-black pointer-events-none"
                    style={{ fontSize: 72, lineHeight: 1, letterSpacing: "-5px", color: "transparent", WebkitTextStroke: `1px ${s.accent}`, opacity: 0.35 }}
                  >{s.n}</span>
                </div>
                {/* Content */}
                <div className="p-7 pt-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                    style={{ background: `rgba(${s.rgb},0.1)`, border: `1px solid rgba(${s.rgb},0.25)` }}
                  >
                    <s.Icon className="w-4.5 h-4.5" style={{ color: s.accent, width: 18, height: 18 }} />
                  </div>
                  <div className="text-base font-bold mb-2.5 tracking-tight text-white">{s.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{s.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          BEFORE / AFTER — full-width dramatic
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="transformation" className="py-32 px-6" style={{ background: "#0A0A0D", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: "#1B8FA0" }}>{t("transform_label")}</div>
              <h2 style={{ fontSize: "clamp(30px, 4vw, 54px)", fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.06 }}>
                {t("transform_title_1")} <br />
                <span style={{ color: "rgba(255,255,255,0.38)" }}>{t("transform_title_2")}</span>
              </h2>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              style={{ fontSize: 15, color: "rgba(255,255,255,0.32)", maxWidth: 310, lineHeight: 1.72 }}>
              {t("transform_subtitle")}
            </motion.p>
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}>
            <HeroSlider />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STYLES — horizontal drag scroll
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="styles" className="py-32">
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <div className="flex items-end justify-between gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: "#1B8FA0" }}>{t("styles_label")}</div>
              <h2 style={{ fontSize: "clamp(28px, 3.8vw, 52px)", fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.08 }}>
                {t("styles_title_1")} <br />{t("styles_title_2")}
              </h2>
            </motion.div>
            <button
              onClick={handleStart}
              className="hidden sm:inline-flex items-center gap-2 flex-shrink-0 font-medium text-sm px-5 py-2.5 rounded-full transition-all duration-300 hover:border-white/20 hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.36)" }}
            >
              {t("styles_try_all")} <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>

        {/* Drag-to-scroll row */}
        <DragScroll className="no-scrollbar gap-4 px-6 pb-4" style={{ paddingLeft: "max(24px, calc((100vw - 1200px) / 2 + 24px))" }}>
          <div className="flex gap-4 px-6" style={{ paddingLeft: "max(24px, calc((100vw - 1200px) / 2 + 24px))" }}>
            {STYLES.map((s, i) => <StyleCard key={s.name} s={s} i={i} onClick={handleStart} />)}
            {/* End CTA tile */}
            <motion.div
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              onClick={handleStart}
              whileHover={{ borderColor: "rgba(27,143,160,0.3)" }}
              className="flex-shrink-0 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300"
              style={{ width: 210, height: 290, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(27,143,160,0.08)", border: "1px solid rgba(27,143,160,0.2)" }}>
                <Sparkles style={{ width: 18, height: 18, color: "#1B8FA0" }} />
              </div>
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.32)" }}>Try all styles</span>
            </motion.div>
          </div>
        </DragScroll>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="testimonials" className="py-32 px-6" style={{ background: "#0A0A0D", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: "#1B8FA0" }}>{t("testimonials_label")}</div>
            <h2 style={{ fontSize: "clamp(28px, 3.8vw, 52px)", fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.08 }}>{t("testimonials_title")}</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((item, i) => <TestimonialCard key={i} t={item} i={i} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA — cinematic full-width with room background
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="cta" className="relative py-48 px-6 text-center overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {/* Background room image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1800&q=80"
            alt="Modern minimal interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #07070A 0%, rgba(7,7,10,0.82) 40%, rgba(7,7,10,0.82) 60%, #07070A 100%)" }} />
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 55% 65% at 50% 50%, rgba(27,143,160,0.09), transparent 70%)" }} />

        <motion.div
          initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <h2 style={{ fontSize: "clamp(36px, 5.5vw, 78px)", fontWeight: 800, letterSpacing: "-3px", lineHeight: 1.04, marginBottom: 20 }}>
            {t("cta_title_1")}{" "}
            <span style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {t("cta_title_2")}
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.38)", marginBottom: 48, lineHeight: 1.72 }}>{t("cta_subtitle")}</p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 font-bold transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", color: "#07070A", fontSize: 17, padding: "20px 48px", borderRadius: 100, boxShadow: "0 0 70px rgba(27,143,160,0.32), 0 20px 60px rgba(0,0,0,0.45)" }}
          >
            <Sparkles className="w-5 h-5" />
            {t("cta_btn")}
          </button>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 22 }}>No credit card required · Free to start</p>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          AUTH MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(14px)" }}
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 22 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl p-8 text-center"
              style={{ background: "#111115", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}>
                <Layers className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">{t("auth_title")}</h2>
              <p className="text-sm mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{t("auth_subtitle")}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full font-semibold py-3.5 rounded-2xl text-sm hover:opacity-90 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", color: "#07070A" }}
                >
                  {t("auth_signup")}
                </button>
                <button
                  onClick={() => base44.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full font-medium py-3.5 rounded-2xl text-sm transition-all hover:bg-white/8"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.58)" }}
                >
                  {t("auth_existing")}
                </button>
              </div>
              <p className="text-xs mt-6" style={{ color: "rgba(255,255,255,0.2)" }}>{t("auth_no_card")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
