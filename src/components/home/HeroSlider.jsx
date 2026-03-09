import { useState, useRef, useEffect, useCallback } from "react";

const BEFORE_IMG = "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80";
const AFTER_IMG  = "https://images.unsplash.com/photo-1618221118493-9cfa1a1c00da?auto=format&fit=crop&w=1600&q=80";

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
          background: "#1a1a1a",
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
        <img
          src={BEFORE_IMG}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* AFTER - clipped */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `polygon(${pos}% 0%, 100% 0%, 100% 100%, ${pos}% 100%)` }}
        >
          <img
            src={AFTER_IMG}
            alt="After - Japandi"
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* subtle warm overlay on after side */}
          <div className="absolute inset-0" style={{ background: "rgba(201,169,110,0.06)" }} />
        </div>

        {/* Drag handle */}
        <div
          className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none"
          style={{
            left: `${pos}%`,
            transform: "translateX(-50%)",
            width: 2,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 0 16px rgba(255,255,255,0.6)",
          }}
        >
          <div
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl text-sm font-bold flex-shrink-0"
            style={{ color: "#555", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: 16 }}
          >
            ⇔
          </div>
        </div>

        {/* Labels */}
        <span className="absolute bottom-4 left-4 text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
          Before
        </span>
        <span className="absolute bottom-4 right-4 text-[11px] font-semibold px-3 py-1.5 rounded-full pointer-events-none" style={{ background: "rgba(201,169,110,0.18)", border: "1px solid rgba(201,169,110,0.4)", color: "#c9a96e", backdropFilter: "blur(10px)" }}>
          Japandi ✦
        </span>

        {/* Floating card 1 */}
        <div className="absolute hidden sm:flex items-center gap-3 p-3 rounded-2xl" style={{ top: "14%", right: "4%", background: "rgba(14,14,14,0.88)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "floatCard 5s ease-in-out infinite" }}>
          <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=80&h=80&q=70" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="Sofa" />
          <div>
            <div className="text-xs font-semibold text-white leading-tight">Muji Linen Sofa</div>
            <div className="text-[11px] font-bold mt-1" style={{ color: "#c9a96e" }}>$1,299</div>
          </div>
          <div className="text-[11px] font-bold px-2.5 py-1.5 rounded-full ml-1 whitespace-nowrap" style={{ background: "linear-gradient(135deg, #c9a96e, #e8c98a)", color: "#1a1208" }}>Shop →</div>
        </div>

        {/* Floating card 2 */}
        <div className="absolute hidden sm:flex items-center gap-3 p-3 rounded-2xl" style={{ bottom: "22%", right: "4%", background: "rgba(14,14,14,0.88)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", animation: "floatCard 5s ease-in-out infinite", animationDelay: "-2.5s" }}>
          <img src="https://images.unsplash.com/photo-1513506003901-1e6a35c1e2df?auto=format&fit=crop&w=80&h=80&q=70" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="Lamp" />
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