import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

function AnimatedCounter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const num = parseInt(target.replace(/\D/g, ""), 10);
        const duration = 1800;
        const steps = 60;
        const inc = num / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += inc;
          if (current >= num) { setCount(num); clearInterval(timer); }
          else setCount(Math.floor(current));
        }, duration / steps);
      }
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const raw = parseInt(target.replace(/\D/g, ""), 10);
  const hasSuffix = target.includes("+") || target.includes(",");

  return (
    <span ref={ref}>
      {count.toLocaleString()}{hasSuffix ? "+" : ""}{suffix}
    </span>
  );
}

export default function StatPanel({ stat, label, body, bg = "#000", labelColor = "#C9963A" }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8 }}
      style={{ background: bg, width: "100%", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(80px,12vw,160px) clamp(24px,6vw,80px)" }}
    >
      <div style={{ textAlign: "center", maxWidth: 700 }}>
        <div className="stat-hero" style={{ color: "#fff" }}>
          <AnimatedCounter target={stat} />
        </div>
        <div className="headline-sm" style={{ color: labelColor, marginTop: 8 }}>{label}</div>
        <p className="body-lg" style={{ color: "rgba(255,255,255,0.52)", marginTop: 20 }}>{body}</p>
      </div>
    </motion.section>
  );
}