import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ROOMS = [
  {
    style: "Japandi",
    before: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85",
    after:  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85",
    color:  "#C9A96E",
  },
  {
    style: "Modern Minimal",
    before: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=85",
    after:  "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=900&q=85",
    color:  "#6B4FBB",
  },
  {
    style: "Boho Chic",
    before: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=85",
    after:  "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=900&q=85",
    color:  "#E8A040",
  },
  {
    style: "Scandinavian",
    before: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=85",
    after:  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=85",
    color:  "#1D9E75",
  },
];

export default function RoomVideoShowcase() {
  const [index, setIndex] = useState(0);
  const [showAfter, setShowAfter] = useState(false);

  useEffect(() => {
    // Cycle: show before for 1.8s → after for 2.5s → next room
    let t1, t2, t3;
    setShowAfter(false);
    t1 = setTimeout(() => setShowAfter(true), 1800);
    t2 = setTimeout(() => {
      setShowAfter(false);
      t3 = setTimeout(() => {
        setIndex((i) => (i + 1) % ROOMS.length);
      }, 600);
    }, 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [index]);

  const room = ROOMS[index];

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Base image (before) */}
      <img
        key={`before-${index}`}
        src={room.before}
        alt="Before"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {/* After image — fades in over before */}
      <AnimatePresence>
        {showAfter && (
          <motion.img
            key={`after-${index}`}
            src={room.after}
            alt={`After — ${room.style}`}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            loading="lazy"
          />
        )}
      </AnimatePresence>

      {/* Dark gradient overlay on left so text is readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,10,11,0.85) 0%, rgba(10,10,11,0.3) 45%, rgba(10,10,11,0.05) 100%)",
        }}
      />

      {/* Before / After label */}
      <AnimatePresence mode="wait">
        <motion.span
          key={showAfter ? "after-label" : "before-label"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="absolute bottom-6 left-6 text-[11px] font-bold px-3 py-1.5 rounded-full pointer-events-none"
          style={{
            background: showAfter
              ? `rgba(${room.color === "#C9A96E" ? "201,169,110" : room.color === "#6B4FBB" ? "107,79,187" : room.color === "#E8A040" ? "232,160,64" : "29,158,117"},0.2)`
              : "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${showAfter ? room.color + "66" : "rgba(255,255,255,0.1)"}`,
            color: showAfter ? room.color : "rgba(255,255,255,0.7)",
          }}
        >
          {showAfter ? `${room.style} ✦` : "Before"}
        </motion.span>
      </AnimatePresence>

      {/* Style dots */}
      <div className="absolute bottom-6 right-6 flex gap-1.5">
        {ROOMS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: i === index ? room.color : "rgba(255,255,255,0.25)",
              transform: i === index ? "scale(1.4)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Floating product card */}
      <AnimatePresence>
        {showAfter && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="absolute top-10 right-6 hidden sm:flex items-center gap-3 p-3 rounded-2xl"
            style={{
              background: "rgba(14,14,14,0.88)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src={room.after}
              loading="lazy"
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
              alt="item"
            />
            <div>
              <div className="text-xs font-semibold text-white leading-tight">AI Generated</div>
              <div className="text-[11px] font-bold mt-0.5" style={{ color: room.color }}>Shop this look →</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}