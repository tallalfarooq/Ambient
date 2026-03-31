import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUOTES = [
  {
    text: "I redesigned my entire living room in 20 minutes. The Japandi style AmbientSpace generated was exactly what I'd been dreaming of for years.",
    name: "Sarah M.", role: "Homeowner, Berlin",
  },
  {
    text: "Used AmbientSpace for our office renovation. Saved 3 weeks of planning. The AI furniture recommendations were remarkably accurate.",
    name: "Kai L.", role: "Startup Founder, Amsterdam",
  },
  {
    text: "Finally an AI that truly understands interior design. The style consistency is incredible, and the before/after comparison blew every client away.",
    name: "Priya K.", role: "Interior Designer, London",
  },
];

export default function PullQuote() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % QUOTES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const q = QUOTES[idx];

  return (
    <section style={{ background: "#f5f5f7", padding: "clamp(80px,12vw,160px) clamp(24px,6vw,80px)" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <p style={{ fontSize: "clamp(24px,3vw,40px)", fontWeight: 400, fontStyle: "italic", color: "#1d1d1f", lineHeight: 1.3, letterSpacing: "-0.025em", marginBottom: 32 }}>
              "{q.text}"
            </p>
            <div className="overline-txt" style={{ color: "#6e6e73" }}>{q.name} — {q.role}</div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 32 }}>
          {QUOTES.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              style={{ width: 6, height: 6, borderRadius: "50%", border: "none", cursor: "pointer", transition: "all 0.3s",
                background: idx === i ? "#1B8FA0" : "#c7c7cc" }} />
          ))}
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 48 }}>
          {["★★★★★  4.9/5 Rating", "10K+ Rooms", "Used in 12 Countries"].map((pill) => (
            <div key={pill} style={{ fontSize: 13, fontWeight: 500, color: "#6e6e73", padding: "8px 18px", borderRadius: 100, background: "rgba(0,0,0,0.05)" }}>
              {pill}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}