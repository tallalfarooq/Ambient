import { useState, useRef, useEffect, useCallback } from "react";

export default function HeroSlider() {
  const [pos, setPos] = useState(100);
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let raf;
    let p = 100;
    const timer = setTimeout(() => {
      const step = () => {
        p = Math.max(50, p - 0.7);
        setPos(p);
        if (p > 50) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 1100);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, []);

  const update = useCallback((clientX) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPos(p);
  }, []);

  return (
    <>
      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <div
        ref={ref}
        className="relative w-full overflow-hidden select-none"
        style={{
          aspectRatio: "16/7",
          borderRadius: 32,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(201,169,110,0.08)",
          cursor: "ew-resize",
        }}
        onMouseDown={(e) => { setDragging(true); update(e.clientX); }}
        onMouseMove={(e) => { if (dragging) update(e.clientX); }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(e) => { setDragging(true); update(e.touches[0].clientX); }}
        onTouchMove={(e) => { if (dragging) update(e.touches[0].clientX); }}
        onTouchEnd={() => setDragging(false)}
      >
        {/* BEFORE */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #1a1208 0%, #2a1e10 40%, #1e1808 100%)" }}>
          <div className="absolute" style={{ bottom: "15%", left: "10%", width: "55%", height: "25%", background: "linear-gradient(180deg, #3d2e1e, #2a1f10)", borderRadius: "6px 6px 0 0" }} />
          <div className="absolute" style={{ bottom: "38%", left: "12%", width: "20%", height: "30%", background: "linear-gradient(180deg, #4a3520, #352515)", borderRadius: 4 }} />
          <div className="absolute bottom-0 left-0 right-0" style={{ height: "14%", background: "linear-gradient(0deg, #0d0a05, transparent)" }} />
        </div>

        {/* AFTER */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, #f5f0e8 0%, #ede5d8 40%, #e8ddd0 100%)",
            clipPath: `polygon(${pos}% 0%, 100% 0%, 100% 100%, ${pos}% 100%)`,
          }}
        >
          <div className="absolute right-0 top-0 bottom-0" style={{ width: "38%", background: "linear-gradient(180deg, #e8dcc8, #d8ccb8)" }} />
          <div className="absolute" style={{ bottom: "12%", left: "8%", width: "58%", height: "22%", background: "linear-gradient(180deg, #d4c4a8, #c4b490)", borderRadius: "4px 4px 0 0" }} />
          <div className="absolute" style={{ bottom: "32%", left: "11%", width: "10%", height: "18%", background: "linear-gradient(180deg, #b8a888, #a89878)", borderRadius: 2 }} />
          <div className="absolute" style={{ bottom: "10%", right: "32%", width: "2%", height: "48%", background: "#c8b898", borderRadius: 100 }} />
          <div className="absolute bottom-0 left-0 right-0" style={{ height: "12%", background: "#c8b898" }} />
        </div>

        {/* Drag handle */}
        <div
          className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none"
          style={{ left: `${pos}%`, transform: "translateX(-50%)", width: 2, background: "rgba(255,255,255,0.9)", boxShadow: "0 0 16px rgba(255,255,255,0.6)" }}
        >
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-xl text-sm font-bold flex-shrink-0" style={{ color: "#555", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
            ⇔
          </div>
        </div>

        {/* Labels */}
        <span className="absolute bottom-4 left-4 text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", color: "rgba(255,255,255,0.7)" }}>
          Before
        </span>
        <span className="absolute bottom-4 right-4 text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none" style={{ background: "rgba(201,169,110,0.15)", border: "1px solid rgba(201,169,110,0.35)", color: "#c9a96e", backdropFilter: "blur(10px)" }}>
          Japandi ✦
        </span>

        {/* Floating card 1 */}
        <div className="absolute hidden sm:flex items-center gap-3 p-3 rounded-2xl" style={{ top: "14%", right: "4%", background: "rgba(18,18,18,0.88)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "floatCard 5s ease-in-out infinite" }}>
          <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #d4c4a8, #b8a888)" }} />
          <div>
            <div className="text-xs font-semibold text-white leading-tight">Muji Linen Sofa</div>
            <div className="text-[11px] font-bold mt-1" style={{ color: "#c9a96e" }}>$1,299</div>
          </div>
          <div className="text-[11px] font-bold px-2.5 py-1.5 rounded-full ml-1 whitespace-nowrap" style={{ background: "linear-gradient(135deg, #c9a96e, #e8c98a)", color: "#1a1208" }}>Shop →</div>
        </div>

        {/* Floating card 2 */}
        <div className="absolute hidden sm:flex items-center gap-3 p-3 rounded-2xl" style={{ bottom: "22%", right: "4%", background: "rgba(18,18,18,0.88)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "floatCard 5s ease-in-out infinite", animationDelay: "-2.5s" }}>
          <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: "linear-gradient(135deg, #c8b88a, #a89868)" }} />
          <div>
            <div className="text-xs font-semibold text-white leading-tight">Arc Floor Lamp</div>
            <div className="text-[11px] font-bold mt-1" style={{ color: "#c9a96e" }}>$380</div>
          </div>
          <div className="text-[11px] font-bold px-2.5 py-1.5 rounded-full ml-1 whitespace-nowrap" style={{ background: "linear-gradient(135deg, #c9a96e, #e8c98a)", color: "#1a1208" }}>Shop →</div>
        </div>
      </div>
    </>
  );
}