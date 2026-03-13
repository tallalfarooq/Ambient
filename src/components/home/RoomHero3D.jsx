import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShoppingBag } from "lucide-react";

const STYLES = [
  { name: "Japandi", gradient: "linear-gradient(135deg, #C9A96E 0%, #8B7355 50%, #4A4840 100%)" },
  { name: "Modern", gradient: "linear-gradient(135deg, #6B4FBB 0%, #9090B0 50%, #CCCCCC 100%)" },
  { name: "Industrial", gradient: "linear-gradient(135deg, #E8A040 0%, #7A5A4A 50%, #3A302A 100%)" },
  { name: "Boho", gradient: "linear-gradient(135deg, #2AAF7A 0%, #C07858 50%, #B07060 100%)" },
];

export default function RoomHero3D() {
  const [styleIndex, setStyleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStyleIndex((i) => (i + 1) % STYLES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentStyle = STYLES[styleIndex];

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Animated gradient background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={styleIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0"
          style={{ background: currentStyle.gradient }}
        />
      </AnimatePresence>

      {/* Floating orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
          style={{
            top: "10%",
            right: "15%",
            background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)",
          }}
        />
        <motion.div
          animate={{
            x: [0, -40, 60, 0],
            y: [0, 50, -40, 0],
            scale: [1, 0.9, 1.15, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: -5 }}
          className="absolute w-[400px] h-[400px] rounded-full opacity-25 blur-3xl"
          style={{
            bottom: "20%",
            left: "10%",
            background: "radial-gradient(circle, rgba(0,0,0,0.3), transparent 70%)",
          }}
        />
      </div>

      {/* Floating overlay cards */}

      {/* Style name card — bottom left */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStyle.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-8 left-6 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
          style={{
            background: "rgba(10,10,12,0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: currentStyle.accent }}
          />
          <span className="text-xs font-semibold text-white tracking-wide">
            Style: {currentStyle.name}
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
            style={{
              background: `${currentStyle.accent}22`,
              border: `1px solid ${currentStyle.accent}55`,
              color: currentStyle.accent,
            }}
          >
            AI ✦
          </span>
        </motion.div>
      </AnimatePresence>

      {/* AI badge — top right */}
      <div
        className="absolute top-8 right-6 flex items-center gap-2 px-3.5 py-2 rounded-xl"
        style={{
          background: "rgba(29,158,117,0.12)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(29,158,117,0.3)",
        }}
      >
        <Sparkles className="w-3 h-3 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-400">
          AI Generated
        </span>
      </div>

      {/* Shop card — bottom right */}
      <div
        className="absolute bottom-8 right-6 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
        style={{
          background: "rgba(10,10,12,0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-medium text-white/70">
          4 items found
        </span>
        <span className="text-[10px] font-bold text-amber-400">Shop →</span>
      </div>

      {/* Style progress dots */}
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2">
        {STYLES.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setStyleIndex(i)}
            className="w-1.5 rounded-full transition-all duration-300"
            style={{
              height: i === styleIndex ? 20 : 6,
              background:
                i === styleIndex
                  ? currentStyle.accent
                  : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* Vignette overlay on left edge to blend with page */}
      <div
        className="absolute inset-y-0 left-0 w-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, #0A0A0B, transparent)",
        }}
      />
    </div>
  );
}