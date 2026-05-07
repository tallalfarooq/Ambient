import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { X, Upload, Palette, ShoppingBag, Sparkles, ArrowRight, Layers, Check, Zap } from "lucide-react";
import {
  motion, AnimatePresence, useInView,
  useMotionValue, useTransform, useSpring,
} from "framer-motion";
import { apiClient } from "@/api/apiClient";
import RoomVideoShowcase from "@/components/home/RoomVideoShowcase";
import HeroSlider from "@/components/home/HeroSlider";
import { useLanguage } from "@/lib/LanguageContext";

/* ─── Static data ────────────────────────────────────────────────────────── */

const STYLES = [
  { name: "Japandi",        desc: "Minimal · Organic · Serene",   badge: "Most Popular", img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80" },
  { name: "Modern Minimal", desc: "Clean · Bold · Functional",    badge: "Trending",     img: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=600&q=80" },
  { name: "Industrial",     desc: "Raw · Urban · Textured",       badge: "Bold",         img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80" },
  { name: "Boho Chic",      desc: "Warm · Layered · Earthy",      badge: "Cozy",         img: "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=600&q=80" },
  { name: "Scandinavian",   desc: "Light · Airy · Functional",    badge: "Clean",        img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80" },
  { name: "Mid-Century",    desc: "Retro · Warm · Timeless",      badge: "Classic",      img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=600&q=80" },
  { name: "Art Deco",       desc: "Glamorous · Bold · Geometric", badge: "Premium",      img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=600&q=80" },
  { name: "Cottagecore",    desc: "Romantic · Soft · Natural",    badge: "Dreamy",       img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80" },
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
    text: `"Finally an AI that truly understands interior design. The style consistency is incredible, and the before/after comparison blew every client away."`,
    name: "Priya K.", role: "Interior Designer, London", avatar: "P", color: "from-amber-400 to-orange-500",
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   3D HERO CARD — the centrepiece
   Mouse position drives spring-physics rotateX/Y. Child chips live at
   genuine translateZ values so they float visually in front of the screen.
═══════════════════════════════════════════════════════════════════════════ */

function HeroCard3D() {
  const containerRef = useRef(null);

  /* Motion values start centred (0.5 = no tilt) */
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  /* Map 0→1 to ±tilt degrees, then smooth with spring */
  const rawRY = useTransform(mx, [0, 1], [-9, 9]);
  const rawRX = useTransform(my, [0, 1], [7, -7]);
  const rotateY = useSpring(rawRY, { stiffness: 100, damping: 22, mass: 1.2 });
  const rotateX = useSpring(rawRX, { stiffness: 100, damping: 22, mass: 1.2 });

  /* Glow centre tracks tilt */
  const glowLeft = useTransform(rotateY, [-9, 9], ["30%", "70%"]);
  const glowTop  = useTransform(rotateX, [-7, 7], ["70%", "30%"]);

  const onMove = (e) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top)  / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <div
      ref={containerRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: "1400px", width: "100%", height: "100%", position: "relative" }}
    >
      {/* Ambient glow that tracks tilt */}
      <motion.div
        style={{
          position: "absolute", width: 340, height: 340,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(27,143,160,0.18), transparent 70%)",
          filter: "blur(60px)",
          left: glowLeft, top: glowTop,
          transform: "translate(-50%,-50%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />

      {/* The 3D card */}
      <motion.div
        style={{
          rotateX, rotateY,
          transformStyle: "preserve-3d",
          width: "100%", height: "100%",
          position: "relative", zIndex: 1,
        }}
      >
        {/* ── Card body (z = 0) ── */}
        <div
          style={{
            width: "100%", height: "100%",
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            transformStyle: "preserve-3d",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06) inset",
            background: "#0a0a0c",
          }}
        >
          {/* macOS-style window chrome */}
          <div style={{
            height: 36, background: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
            flexShrink: 0,
          }}>
            {[["#FF5F57","#FF3B30"],["#FFBD2E","#FF9500"],["#28C840","#34C759"]].map(([bg, hover], i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: bg }} />
            ))}
            <div style={{
              flex: 1, height: 18, borderRadius: 6, marginLeft: 6,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>ambientspace.ai</span>
            </div>
          </div>

          {/* Room content fills the rest */}
          <div style={{ position: "absolute", inset: 36, top: 36, bottom: 0, left: 0, right: 0, overflow: "hidden" }}>
            <RoomVideoShowcase />
            {/* Subtle glass sheen over image — the "screen reflection" */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)",
            }} />
          </div>
        </div>

        {/* ── Floating chip 1: AI status — sits in front of card at translateZ ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          style={{
            position: "absolute", top: "18%", right: "-6%",
            transform: "translateZ(42px)",
            background: "rgba(10,10,14,0.92)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(27,143,160,0.35)",
            borderRadius: 14, padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(27,143,160,0.12)",
            animation: "floatY 5s ease-in-out infinite",
          }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(27,143,160,0.15)", border: "1px solid rgba(27,143,160,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap style={{ width: 14, height: 14, color: "#1B8FA0" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>AI Generating…</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Japandi · 94% match</div>
          </div>
          {/* Pulsing dot */}
          <div style={{ position: "relative", width: 8, height: 8 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#1B8FA0", animation: "pulseRing 1.6s ease-out infinite" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1B8FA0" }} />
          </div>
        </motion.div>

        {/* ── Floating chip 2: Shop this look ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          style={{
            position: "absolute", bottom: "24%", right: "-4%",
            transform: "translateZ(30px)",
            background: "rgba(10,10,14,0.92)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(201,150,58,0.3)",
            borderRadius: 14, padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(201,150,58,0.1)",
            animation: "floatY 5s ease-in-out infinite",
            animationDelay: "-2.5s",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=64&h=64&q=70"
            style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }}
            alt="sofa"
          />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>Muji Linen Sofa</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#C9963A", marginTop: 1 }}>$1,299 · Shop →</div>
          </div>
        </motion.div>

        {/* ── Floating chip 3: Rooms redesigned (bottom-left, closer z) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          style={{
            position: "absolute", bottom: "8%", left: "4%",
            transform: "translateZ(22px)",
            background: "rgba(10,10,14,0.88)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "8px 12px",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          }}
        >
          <Check style={{ width: 12, height: 12, color: "#1D9E75" }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>10,000+ rooms redesigned</span>
        </motion.div>

        {/* ── Card base shadow (behind card) ── */}
        <div style={{
          position: "absolute", bottom: "-28px", left: "8%", right: "8%",
          height: 28, borderRadius: "50%",
          background: "rgba(27,143,160,0.15)",
          filter: "blur(28px)",
          transform: "translateZ(-10px)",
        }} />
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3D TILT CARD — reusable wrapper for style cards
═══════════════════════════════════════════════════════════════════════════ */

function TiltCard({ children, style, className, intensity = 14 }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rawRY = useTransform(mx, [0, 1], [-intensity, intensity]);
  const rawRX = useTransform(my, [0, 1], [intensity, -intensity]);
  const rotateY = useSpring(rawRY, { stiffness: 200, damping: 18 });
  const rotateX = useSpring(rawRX, { stiffness: 200, damping: 18 });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top)  / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <div style={{ perspective: "900px", ...style }} className={className}>
      <motion.div
        onMouseMove={onMove} onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d", width: "100%", height: "100%" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ─── Utility sub-components ─────────────────────────────────────────────── */

function AnimatedCounter({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const match = value.match(/(\d+)/);
    if (!match) { setDisplay(value); return; }
    const end = parseInt(match[1]);
    const pre = value.slice(0, match.index);
    const suf = value.slice(match.index + match[1].length);
    let n = 0;
    const iv = setInterval(() => {
      n = Math.min(n + Math.ceil(end / 55), end);
      setDisplay(`${pre}${n.toLocaleString()}${suf}`);
      if (n >= end) clearInterval(iv);
    }, 1400 / 55);
    return () => clearInterval(iv);
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

function Ticker() {
  const ITEMS = [
    "Japandi", "AI-Powered", "Modern Minimal", "Boho Chic",
    "Industrial Loft", "Scandinavian", "Mid-Century", "Shop the Look",
    "Art Deco", "Cottagecore", "Instant Render", "Real Furniture",
  ];
  const all = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", gap: 48, animation: "ticker 34s linear infinite", width: "max-content" }}>
        {all.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#C9963A", opacity: 0.45, display: "inline-block" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)" }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StyleCard({ s, i, onClick }) {
  return (
    <TiltCard
      style={{ width: 200, height: 275, flexShrink: 0, cursor: "pointer" }}
      intensity={12}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        viewport={{ once: true }}
        onClick={onClick}
        className="relative rounded-2xl overflow-hidden w-full h-full group"
        style={{
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <img src={s.img} alt={s.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-108" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.05) 55%, transparent 100%)" }} />
        {/* Hover sheen — sits at translateZ above image */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07), transparent 60%)", transform: "translateZ(4px)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4" style={{ transform: "translateZ(8px)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>{s.name}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.42)", marginTop: 2 }}>{s.desc}</div>
        </div>
        {/* Badge */}
        <div
          className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 20, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", transform: "translateZ(12px)" }}
        >{s.badge}</div>
      </motion.div>
    </TiltCard>
  );
}

function TestimonialCard({ t: item, i }) {
  const stars = "★".repeat(item.stars);
  if (item.featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="col-span-full rounded-3xl overflow-hidden grid sm:grid-cols-5"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="sm:col-span-3 p-8 sm:p-12 flex flex-col justify-between">
          <div>
            <div style={{ fontSize: 13, letterSpacing: 4, color: "#C9963A", marginBottom: 20 }}>{stars}</div>
            <p style={{ fontSize: "clamp(15px, 1.4vw, 18px)", lineHeight: 1.75, color: "rgba(255,255,255,0.68)", fontWeight: 300, marginBottom: 32 }}>{item.text}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${item.color} text-white`}>{item.avatar}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 1 }}>{item.role}</div>
            </div>
          </div>
        </div>
        <div className="sm:col-span-2 relative hidden sm:block" style={{ minHeight: 260 }}>
          <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=85&auto=format&fit=crop" alt="Room" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(5,5,8,0.6), transparent 50%)" }} />
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
      className="rounded-3xl p-7 transition-all duration-300"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      whileHover={{ borderColor: "rgba(201,150,58,0.2)", background: "rgba(255,255,255,0.03)" }}
    >
      <div style={{ fontSize: 12, letterSpacing: 4, color: "#C9963A", marginBottom: 16 }}>{stars}</div>
      <p style={{ fontSize: 14, lineHeight: 1.78, color: "rgba(255,255,255,0.55)", fontWeight: 300, marginBottom: 24 }}>{item.text}</p>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br ${item.color} text-white`}>{item.avatar}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{item.name}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.26)", marginTop: 1 }}>{item.role}</div>
        </div>
      </div>
    </motion.div>
  );
}

function DragScroll({ children }) {
  const ref = useRef(null);
  const down = useRef(false);
  const startX = useRef(0);
  const sl = useRef(0);
  return (
    <div
      ref={ref}
      style={{ display: "flex", gap: 14, overflowX: "auto", cursor: "grab", userSelect: "none", scrollbarWidth: "none", msOverflowStyle: "none" }}
      className="no-scrollbar"
      onMouseDown={(e) => { down.current = true; startX.current = e.pageX - ref.current.offsetLeft; sl.current = ref.current.scrollLeft; ref.current.style.cursor = "grabbing"; }}
      onMouseLeave={() => { down.current = false; if (ref.current) ref.current.style.cursor = "grab"; }}
      onMouseUp={() => { down.current = false; if (ref.current) ref.current.style.cursor = "grab"; }}
      onMouseMove={(e) => { if (!down.current) return; e.preventDefault(); ref.current.scrollLeft = sl.current - (e.pageX - ref.current.offsetLeft - startX.current) * 1.5; }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  const [user, setUser] = useState(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => { apiClient.auth.me().then(setUser).catch(() => setUser(null)); }, []);

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
    { n: "01", Icon: Upload,      title: t("step1_title"), desc: t("step1_desc"), accent: "#1B8FA0", rgb: "27,143,160",   img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=700&q=80" },
    { n: "02", Icon: Palette,     title: t("step2_title"), desc: t("step2_desc"), accent: "#C9963A", rgb: "201,150,58",  img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=700&q=80" },
    { n: "03", Icon: ShoppingBag, title: t("step3_title"), desc: t("step3_desc"), accent: "#9B7EC8", rgb: "155,126,200", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80" },
  ];

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#050508" }}>
      <style>{`
        @keyframes ticker   { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes floatY   { 0%,100%{transform:translateY(0px) translateZ(42px)} 50%{transform:translateY(-9px) translateZ(42px)} }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes floatOrb {
          0%,100%{transform:translate(0,0) scale(1)}
          40%{transform:translate(22px,-32px) scale(1.06)}
          70%{transform:translate(-16px,18px) scale(.94)}
        }
        @keyframes rotateGlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .dot-grid {
          background-image: radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px);
          background-size: 28px 28px;
        }
      `}</style>

      <Ticker />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex flex-col lg:flex-row items-center overflow-hidden">

        {/* Background: dot grid + orbs */}
        <div className="absolute inset-0 dot-grid opacity-35 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div style={{ position:"absolute", width:900, height:900, top:-300, left:-400, borderRadius:"50%", background:"radial-gradient(circle,rgba(27,143,160,0.11),transparent 60%)", filter:"blur(100px)", animation:"floatOrb 18s ease-in-out infinite" }} />
          <div style={{ position:"absolute", width:700, height:700, bottom:-200, left:"30%", borderRadius:"50%", background:"radial-gradient(circle,rgba(201,150,58,0.07),transparent 60%)", filter:"blur(90px)", animation:"floatOrb 18s ease-in-out infinite", animationDelay:"-8s" }} />
          <div style={{ position:"absolute", width:500, height:500, top:"30%", right:"5%", borderRadius:"50%", background:"radial-gradient(circle,rgba(155,126,200,0.08),transparent 60%)", filter:"blur(70px)", animation:"floatOrb 22s ease-in-out infinite", animationDelay:"-14s" }} />
        </div>

        {/* LEFT — text */}
        <div className="relative z-10 w-full lg:w-[46%] px-8 sm:px-14 lg:px-20 xl:px-24 pt-28 pb-12 lg:py-0 flex flex-col justify-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.55 }}
            className="inline-flex items-center gap-2.5 rounded-full w-fit px-4 py-2 mb-10"
            style={{ background:"rgba(27,143,160,0.07)", border:"1px solid rgba(27,143,160,0.2)", fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:"#1B8FA0" }}
          >
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#1B8FA0", display:"block", boxShadow:"0 0 10px rgba(27,143,160,0.8)" }} />
            {t("hero_badge")}
          </motion.div>

          {/* Headline — 3 distinct lines with clear visual hierarchy */}
          <h1 style={{ fontWeight:800, lineHeight:1.0, marginBottom:26 }}>

            {/* Line 1: plain white — smallest of the three */}
            <motion.span
              initial={{ opacity:0, y:28, filter:"blur(5px)" }}
              animate={{ opacity:1, y:0,  filter:"blur(0px)" }}
              transition={{ delay:0.1, duration:0.65, ease:[0.16,1,0.3,1] }}
              style={{ display:"block", fontSize:"clamp(32px,4vw,58px)", color:"#fff", letterSpacing:"-2px" }}
            >
              {t("hero_title_1")}
            </motion.span>

            {/* Line 2: image-bleed — the visual centrepiece, one clear phrase */}
            <motion.span
              initial={{ opacity:0, scale:0.96, y:14 }}
              animate={{ opacity:1, scale:1,    y:0 }}
              transition={{ delay:0.3, duration:0.9, ease:[0.16,1,0.3,1] }}
              style={{
                display:"block",
                fontSize:"clamp(50px,7.5vw,110px)",
                letterSpacing:"-4px",
                backgroundImage:"url('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=90')",
                backgroundSize:"160% 160%",
                backgroundPosition:"center 35%",
                WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",
                backgroundClip:"text",
                filter:"brightness(1.15) saturate(1.2)",
                lineHeight:0.9,
              }}
            >
              {t("hero_title_2")}
            </motion.span>

            {/* Line 3: "in minutes" — clean, muted, clearly subordinate */}
            <motion.span
              initial={{ opacity:0, y:14 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:0.5, duration:0.65, ease:[0.16,1,0.3,1] }}
              style={{ display:"block", fontSize:"clamp(28px,3.4vw,50px)", letterSpacing:"-2px", color:"rgba(255,255,255,0.38)", fontWeight:500, marginTop:4 }}
            >
              {t("hero_title_3")}
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55, duration:0.6 }}
            style={{ fontSize:"clamp(14px,1.4vw,17px)", color:"rgba(255,255,255,0.38)", marginBottom:38, maxWidth:400, lineHeight:1.78, fontWeight:300 }}
          >
            {t("hero_subtitle")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.64 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-12"
          >
            <button
              onClick={handleStart}
              className="group inline-flex items-center gap-2.5 font-bold transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.99]"
              style={{ background:"linear-gradient(135deg,#1B8FA0,#C9963A)", color:"#050508", fontSize:15, padding:"15px 32px", borderRadius:100, boxShadow:"0 0 40px rgba(27,143,160,0.25), 0 8px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22)" }}
            >
              <Sparkles style={{ width:15, height:15 }} />
              {t("hero_cta_primary")}
              <ArrowRight style={{ width:15, height:15, transition:"transform 0.3s" }} className="group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => navigate(createPageUrl("Projects"))}
              className="inline-flex items-center gap-2 font-medium text-sm transition-all duration-300 hover:border-white/18 hover:text-white"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.48)", padding:"14px 24px", borderRadius:100 }}
            >
              {t("hero_cta_secondary")}
              <ArrowRight style={{ width:13, height:13 }} />
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.8 }}
            className="flex flex-wrap items-center gap-4"
          >
            <div className="flex -space-x-2">
              {[["S","#1B8FA0"],["K","#C9963A"],["P","#9B7EC8"],["M","#1D9E75"]].map(([l,bg],i) => (
                <div key={i} style={{ width:26, height:26, borderRadius:"50%", background:bg, border:"2px solid #050508", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#fff" }}>{l}</div>
              ))}
            </div>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.26)" }}>
              <span style={{ color:"#C9963A" }}>★★★★★</span>&nbsp; {t("hero_social_rating")}
            </span>
            <span style={{ width:1, height:12, background:"rgba(255,255,255,0.1)", display:"block" }} />
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.26)" }}>{t("hero_social_rooms")}</span>
          </motion.div>
        </div>

        {/* RIGHT — 3D floating card */}
        <motion.div
          initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3, duration:1.0, ease:[0.16,1,0.3,1] }}
          className="relative z-10 w-full lg:w-[54%] h-[56vw] lg:h-screen max-h-[680px] lg:max-h-screen px-6 lg:px-10 py-8 lg:py-16"
        >
          <HeroCard3D />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 pointer-events-none"
        >
          <div style={{ width:1, height:40, background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.18))" }} />
          <span style={{ fontSize:8, letterSpacing:"0.25em", textTransform:"uppercase", color:"rgba(255,255,255,0.15)" }}>Scroll</span>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TRUST BAR
      ══════════════════════════════════════════════════════ */}
      <div style={{ borderTop:"1px solid rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-wrap items-center justify-center gap-10 sm:gap-16">
          {TRUST.map((item, i) => (
            <motion.div
              key={i} initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:i*0.07 }}
              className="flex flex-col items-center gap-1.5"
            >
              <span style={{ fontSize:"clamp(22px,2.8vw,32px)", fontWeight:800, letterSpacing:"-1px", background:"linear-gradient(135deg,#fff,rgba(255,255,255,0.48))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                <AnimatedCounter value={item.number} />
              </span>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(255,255,255,0.22)" }}>{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="mb-20 max-w-xl">
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.22em", textTransform:"uppercase", color:"#1B8FA0", marginBottom:14 }}>{t("how_label")}</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,56px)", fontWeight:800, letterSpacing:"-2.5px", lineHeight:1.06, marginBottom:14 }}>
              {t("how_title_1")}{" "}
              <span style={{ background:"linear-gradient(135deg,#1B8FA0,#C9963A)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                {t("how_title_2")}
              </span>
            </h2>
            <p style={{ fontSize:16, color:"rgba(255,255,255,0.35)", lineHeight:1.75, fontWeight:300 }}>{t("how_subtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity:0, rotateX:18, y:30 }}
                whileInView={{ opacity:1, rotateX:0, y:0 }}
                transition={{ delay:i*0.13, duration:0.7, ease:[0.16,1,0.3,1] }}
                viewport={{ once:true }}
                style={{ perspective:"900px" }}
              >
                <TiltCard style={{ height:"100%" }} intensity={8}>
                  <div
                    className="group relative rounded-3xl overflow-hidden h-full"
                    style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}
                  >
                    {/* Room photo */}
                    <div className="relative overflow-hidden" style={{ height:190 }}>
                      <img src={s.img} alt={s.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0" style={{ background:"linear-gradient(to bottom, transparent 25%, rgba(5,5,8,1) 100%)" }} />
                      {/* Ghost step number */}
                      <span className="absolute top-2 left-3 font-black pointer-events-none" style={{ fontSize:80, lineHeight:1, letterSpacing:"-6px", color:"transparent", WebkitTextStroke:`1px ${s.accent}`, opacity:0.28 }}>
                        {s.n}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="p-7 pt-5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6"
                        style={{ background:`rgba(${s.rgb},0.1)`, border:`1px solid rgba(${s.rgb},0.25)`, transform:"translateZ(6px)" }}
                      >
                        <s.Icon style={{ width:17, height:17, color:s.accent }} />
                      </div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:"-0.4px", marginBottom:8 }}>{s.title}</div>
                      <div style={{ fontSize:13, lineHeight:1.75, color:"rgba(255,255,255,0.36)", fontWeight:300 }}>{s.desc}</div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BEFORE / AFTER
      ══════════════════════════════════════════════════════ */}
      <section id="transformation" className="py-36 px-6" style={{ background:"rgba(255,255,255,0.01)", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
            <motion.div initial={{ opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.22em", textTransform:"uppercase", color:"#1B8FA0", marginBottom:14 }}>{t("transform_label")}</div>
              <h2 style={{ fontSize:"clamp(28px,3.8vw,52px)", fontWeight:800, letterSpacing:"-2px", lineHeight:1.06 }}>
                {t("transform_title_1")}<br />
                <span style={{ color:"rgba(255,255,255,0.35)" }}>{t("transform_title_2")}</span>
              </h2>
            </motion.div>
            <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }}
              style={{ fontSize:14, color:"rgba(255,255,255,0.3)", maxWidth:290, lineHeight:1.78, fontWeight:300 }}
            >
              {t("transform_subtitle")}
            </motion.p>
          </div>
          <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} transition={{ duration:0.7 }} viewport={{ once:true }}>
            <HeroSlider />
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          STYLES — drag-to-scroll 3D cards
      ══════════════════════════════════════════════════════ */}
      <section id="styles" className="py-36">
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <div className="flex items-end justify-between gap-6">
            <motion.div initial={{ opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.22em", textTransform:"uppercase", color:"#1B8FA0", marginBottom:14 }}>{t("styles_label")}</div>
              <h2 style={{ fontSize:"clamp(26px,3.6vw,50px)", fontWeight:800, letterSpacing:"-2px", lineHeight:1.08 }}>
                {t("styles_title_1")}<br />{t("styles_title_2")}
              </h2>
            </motion.div>
            <button
              onClick={handleStart}
              className="hidden sm:inline-flex items-center gap-2 font-medium text-sm px-5 py-2.5 rounded-full transition-all hover:border-white/18 hover:text-white flex-shrink-0"
              style={{ border:"1px solid rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.34)", fontSize:13 }}
            >
              {t("styles_try_all")} <ArrowRight style={{ width:12, height:12 }} />
            </button>
          </div>
        </div>
        <div style={{ paddingLeft:"max(24px, calc((100vw - 1200px) / 2 + 24px))" }}>
          <DragScroll>
            {STYLES.map((s, i) => <StyleCard key={s.name} s={s} i={i} onClick={handleStart} />)}
            {/* End tile */}
            <div
              onClick={handleStart}
              style={{ width:200, height:275, flexShrink:0, borderRadius:20, border:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, cursor:"pointer", background:"rgba(255,255,255,0.015)" }}
            >
              <div style={{ width:42, height:42, borderRadius:14, background:"rgba(27,143,160,0.08)", border:"1px solid rgba(27,143,160,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Sparkles style={{ width:17, height:17, color:"#1B8FA0" }} />
              </div>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)", fontWeight:500 }}>Try all styles</span>
            </div>
          </DragScroll>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════ */}
      <section id="testimonials" className="py-36 px-6" style={{ background:"rgba(255,255,255,0.01)", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity:0, y:18 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="mb-16">
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.22em", textTransform:"uppercase", color:"#1B8FA0", marginBottom:14 }}>{t("testimonials_label")}</div>
            <h2 style={{ fontSize:"clamp(26px,3.6vw,50px)", fontWeight:800, letterSpacing:"-2px", lineHeight:1.08 }}>{t("testimonials_title")}</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((item, i) => <TestimonialCard key={i} t={item} i={i} />)}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINAL CTA — cinematic room background
      ══════════════════════════════════════════════════════ */}
      <section id="cta" className="relative py-52 px-6 text-center overflow-hidden" style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1800&q=80" alt="interior" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background:"linear-gradient(to bottom, #050508 0%, rgba(5,5,8,0.85) 40%, rgba(5,5,8,0.85) 60%, #050508 100%)" }} />
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ background:"radial-gradient(ellipse 50% 60% at 50% 50%, rgba(27,143,160,0.08), transparent 70%)" }} />
        <motion.div
          initial={{ opacity:0, y:28 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <h2 style={{ fontSize:"clamp(34px,5.2vw,76px)", fontWeight:800, letterSpacing:"-3px", lineHeight:1.04, marginBottom:18 }}>
            {t("cta_title_1")}{" "}
            <span style={{ background:"linear-gradient(135deg,#1B8FA0,#C9963A)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              {t("cta_title_2")}
            </span>
          </h2>
          <p style={{ fontSize:17, color:"rgba(255,255,255,0.36)", marginBottom:48, lineHeight:1.75, fontWeight:300 }}>{t("cta_subtitle")}</p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 font-bold transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.99]"
            style={{ background:"linear-gradient(135deg,#1B8FA0,#C9963A)", color:"#050508", fontSize:17, padding:"20px 48px", borderRadius:100, boxShadow:"0 0 70px rgba(27,143,160,0.3), 0 24px 60px rgba(0,0,0,0.5)" }}
          >
            <Sparkles style={{ width:18, height:18 }} />
            {t("cta_btn")}
          </button>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.18)", marginTop:20, letterSpacing:"0.05em" }}>No credit card required · Free to start</p>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════
          AUTH MODAL
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(16px)" }}
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity:0, scale:0.93, y:24 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.92 }}
              transition={{ type:"spring", stiffness:260, damping:26 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl p-8 text-center"
              style={{ background:"#0f0f13", border:"1px solid rgba(255,255,255,0.09)", boxShadow:"0 40px 120px rgba(0,0,0,0.8)" }}
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors">
                <X style={{ width:18, height:18 }} />
              </button>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background:"linear-gradient(135deg,#1B8FA0,#C9963A)" }}>
                <Layers style={{ width:26, height:26, color:"#fff" }} />
              </div>
              <h2 style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.5px", marginBottom:8 }}>{t("auth_title")}</h2>
              <p style={{ fontSize:14, color:"rgba(255,255,255,0.38)", marginBottom:28, lineHeight:1.7, fontWeight:300 }}>{t("auth_subtitle")}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => apiClient.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full font-bold py-3.5 rounded-2xl text-sm hover:opacity-90 transition-opacity"
                  style={{ background:"linear-gradient(135deg,#1B8FA0,#C9963A)", color:"#050508" }}
                >
                  {t("auth_signup")}
                </button>
                <button
                  onClick={() => apiClient.auth.redirectToLogin(window.location.origin + createPageUrl("Studio"))}
                  className="w-full font-medium py-3.5 rounded-2xl text-sm transition-all hover:bg-white/5"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.55)" }}
                >
                  {t("auth_existing")}
                </button>
              </div>
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.18)", marginTop:20 }}>{t("auth_no_card")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
