import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PersistentBar({ onStart }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const pageH = document.body.scrollHeight;
      const viewH = window.innerHeight;
      setVisible(scrollY > viewH && scrollY < pageH - viewH - 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
            background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "12px clamp(24px,6vw,80px)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Ambient Space</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>AI Interior Design · Free to start</div>
          </div>
          <button onClick={onStart}
            style={{ background: "linear-gradient(135deg,#1B8FA0,#C9963A)", color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 24px", borderRadius: 100, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
            Start Designing Free →
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}