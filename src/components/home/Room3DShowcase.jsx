import { useState, useEffect } from "react";

export default function Room3DShowcase() {
  const [currentStyle, setCurrentStyle] = useState(0);
  
  const styles = [
    { 
      name: "Japandi",
      gradient: "linear-gradient(135deg, #E8DFD0 0%, #C9A96E 100%)",
    },
    { 
      name: "Modern",
      gradient: "linear-gradient(135deg, #2C2C2C 0%, #6B4FBB 100%)",
    },
    { 
      name: "Industrial",
      gradient: "linear-gradient(135deg, #5A4A3A 0%, #E8A040 100%)",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStyle((s) => (s + 1) % styles.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const style = styles[currentStyle];

  return (
    <div className="w-full h-full relative overflow-hidden">
      <style>{`
        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.05); }
          66% { transform: translate(-15px, 20px) scale(0.95); }
        }
        @keyframes fadeGradient {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 transition-all duration-[2000ms] ease-in-out"
        style={{ 
          background: style.gradient,
          animation: "fadeGradient 6s ease-in-out infinite"
        }}
      />
      
      {/* Floating orbs */}
      <div 
        className="absolute w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{
          top: '10%',
          left: '20%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)',
          animation: 'floatOrb 12s ease-in-out infinite'
        }}
      />
      <div 
        className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{
          bottom: '15%',
          right: '15%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)',
          animation: 'floatOrb 15s ease-in-out infinite',
          animationDelay: '-7s'
        }}
      />
      
      {/* Room outline shapes */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <div className="relative w-3/4 h-3/4">
          {/* Floor */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/40" />
          {/* Walls */}
          <div className="absolute top-0 left-0 bottom-0 w-px bg-white/40" />
          <div className="absolute top-0 right-0 bottom-0 w-px bg-white/40" />
          <div className="absolute top-0 left-0 right-0 h-px bg-white/40" />
        </div>
      </div>
      
      {/* Style indicator */}
      <div className="absolute bottom-6 left-6 px-4 py-2 rounded-xl bg-black/20 backdrop-blur-md border border-white/10">
        <div className="text-white/90 text-sm font-semibold">{style.name} Style</div>
      </div>
    </div>
  );
}