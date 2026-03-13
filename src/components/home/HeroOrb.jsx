export default function HeroOrb() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div 
        className="w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, #1D9E75 0%, #6B4FBB 50%, transparent 70%)",
          animation: "pulse 4s ease-in-out infinite"
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}