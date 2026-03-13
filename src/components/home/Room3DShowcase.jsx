import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FURNITURE_ITEMS = [
  { id: 1, name: "Sofa", delay: 0, left: "35%", top: "55%", width: 120, height: 60, color: "#4A4840" },
  { id: 2, name: "Coffee Table", delay: 600, left: "42%", top: "45%", width: 60, height: 40, color: "#1A1008" },
  { id: 3, name: "Floor Lamp", delay: 1200, left: "15%", top: "40%", width: 20, height: 80, color: "#C0A880" },
  { id: 4, name: "Plant", delay: 1800, left: "70%", top: "60%", width: 35, height: 45, color: "#2D5A3D" },
  { id: 5, name: "Rug", delay: 2400, left: "38%", top: "48%", width: 90, height: 70, color: "#B8A88A", zIndex: 0 },
  { id: 6, name: "Wall Art", delay: 3000, left: "60%", top: "20%", width: 55, height: 40, color: "#C9A96E" },
];

const COLOR_SCHEMES = [
  { name: "Japandi", accent: "#C9A96E", bg: "linear-gradient(135deg, #2D2218 0%, #1a1410 100%)" },
  { name: "Modern", accent: "#6B4FBB", bg: "linear-gradient(135deg, #1C1C1C 0%, #0d0d0d 100%)" },
  { name: "Industrial", accent: "#E8A040", bg: "linear-gradient(135deg, #3A302A 0%, #2a201a 100%)" },
  { name: "Boho", accent: "#2AAF7A", bg: "linear-gradient(135deg, #4A3A28 0%, #3a2a18 100%)" },
];

export default function Room3DShowcase() {
  const [phase, setPhase] = useState(0); // 0 = empty, 1-6 = items appearing
  const [colorScheme, setColorScheme] = useState(0);

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhase((p) => (p >= 6 ? 0 : p + 1));
    }, 800);

    const colorTimer = setInterval(() => {
      setColorScheme((c) => (c + 1) % COLOR_SCHEMES.length);
    }, 5000);

    return () => {
      clearInterval(phaseTimer);
      clearInterval(colorTimer);
    };
  }, []);

  const currentScheme = COLOR_SCHEMES[colorScheme];

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: currentScheme.bg }}>
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            `radial-gradient(circle at 30% 40%, ${currentScheme.accent}15, transparent 50%)`,
            `radial-gradient(circle at 70% 60%, ${currentScheme.accent}15, transparent 50%)`,
            `radial-gradient(circle at 30% 40%, ${currentScheme.accent}15, transparent 50%)`,
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Room perspective container */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: "1200px" }}>
        <motion.div
          className="relative"
          style={{
            width: "80%",
            height: "70%",
            transformStyle: "preserve-3d",
          }}
          animate={{
            rotateY: [-2, 2, -2],
            rotateX: [1, -1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Back wall */}
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              background: "linear-gradient(180deg, rgba(232,223,208,0.15) 0%, rgba(232,223,208,0.05) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              transform: "translateZ(-100px)",
            }}
          />

          {/* Floor */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-2/3 rounded-xl"
            style={{
              background: "linear-gradient(180deg, transparent 0%, rgba(45,34,24,0.3) 100%)",
              transformOrigin: "bottom",
              transform: "rotateX(60deg) translateZ(-50px)",
            }}
          />

          {/* Furniture items */}
          <AnimatePresence>
            {FURNITURE_ITEMS.filter((_, i) => i < phase).map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.3, y: -50 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  boxShadow: [
                    `0 10px 30px ${currentScheme.accent}40`,
                    `0 15px 40px ${currentScheme.accent}60`,
                    `0 10px 30px ${currentScheme.accent}40`,
                  ],
                }}
                exit={{ opacity: 0, scale: 0.3 }}
                transition={{
                  duration: 0.6,
                  delay: item.delay / 1000,
                  boxShadow: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
                className="absolute rounded-lg"
                style={{
                  left: item.left,
                  top: item.top,
                  width: item.width,
                  height: item.height,
                  background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)`,
                  border: `1px solid ${currentScheme.accent}40`,
                  zIndex: item.zIndex ?? index + 1,
                  transform: "translateZ(20px)",
                }}
              >
                {/* Glowing effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.3,
                  }}
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${currentScheme.accent}60, transparent 70%)`,
                  }}
                />

                {/* Item label */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: item.delay / 1000 + 0.3 }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(10,10,12,0.8)",
                      color: currentScheme.accent,
                      border: `1px solid ${currentScheme.accent}40`,
                    }}
                  >
                    {item.name}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Color scheme indicator */}
      <motion.div
        key={colorScheme}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl"
        style={{
          background: "rgba(10,10,12,0.6)",
          border: `1px solid ${currentScheme.accent}40`,
        }}
      >
        <motion.div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: currentScheme.accent }}
          animate={{
            scale: [1, 1.3, 1],
            boxShadow: [`0 0 0px ${currentScheme.accent}`, `0 0 12px ${currentScheme.accent}`, `0 0 0px ${currentScheme.accent}`],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-xs font-semibold text-white">Style: {currentScheme.name}</span>
      </motion.div>

      {/* Bottom text overlay */}
      <div className="absolute bottom-8 left-8 right-8 text-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="inline-block px-6 py-3 rounded-2xl backdrop-blur-xl"
          style={{
            background: "rgba(10,10,12,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p className="text-sm font-semibold text-white flex items-center justify-center gap-2">
            Watch your space transform
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              ✨
            </motion.span>
          </p>
          <p className="text-xs text-white/50 mt-1">AI-powered interior design in real-time</p>
        </motion.div>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-8 right-8 flex gap-1.5">
        {FURNITURE_ITEMS.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i < phase ? 24 : 6,
              height: 6,
              background: i < phase ? currentScheme.accent : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}