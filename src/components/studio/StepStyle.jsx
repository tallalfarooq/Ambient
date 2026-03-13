import { Check } from "lucide-react";

const STYLES = [
  {
    name: "Japandi",
    desc: "Calm · Natural · Wabi-sabi",
    palette: "Sage greens, warm whites, natural oak",
    img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80",
    accent: "#B8A88A",
  },
  {
    name: "Industrial",
    desc: "Raw · Steel · Utilitarian",
    palette: "Gunmetal, rust, weathered wood",
    img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80",
    accent: "#8B6555",
  },
  {
    name: "Boho",
    desc: "Layered · Rattan · Global",
    palette: "Terracotta, burnt orange, cream",
    img: "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=400&q=80",
    accent: "#C07858",
  },
  {
    name: "Modern Minimal",
    desc: "Clean · Negative space · Purpose",
    palette: "White, greige, matte black",
    img: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=400&q=80",
    accent: "#D0D0D0",
  },
  {
    name: "Cottagecore",
    desc: "Floral · Soft light · Comfort",
    palette: "Blush, dusty rose, sage",
    img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80",
    accent: "#D4A0A0",
  },
  {
    name: "Mid-Century Modern",
    desc: "Organic · Walnut · Vintage",
    palette: "Mustard, avocado, warm brown",
    img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=400&q=80",
    accent: "#C9A040",
  },
  {
    name: "Art Deco",
    desc: "Geometric · Gold · Glamour",
    palette: "Black, gold, emerald",
    img: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=400&q=80",
    accent: "#C9A96E",
  },
  {
    name: "Scandi",
    desc: "Hygge · Birch · Simplicity",
    palette: "White, birch, soft blues",
    img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80",
    accent: "#9090B0",
  },
];

const PALETTES = [
  { label: "Neutral & Warm",   dot: "#C9A96E" },
  { label: "Cool & Calm",      dot: "#7090B0" },
  { label: "Bold & Vibrant",   dot: "#C04060" },
  { label: "Earthy & Natural", dot: "#8B6040" },
  { label: "Monochrome",       dot: "#888888" },
  { label: "Pastel Soft",      dot: "#D4A0C0" },
];

const VIBES = [
  "Cosy", "Airy", "Dark & moody", "Light-filled", "Luxurious",
  "Rustic", "Futuristic", "Romantic", "Playful", "Zen",
];

export default function StepStyle({ data, update, onNext, onBack }) {
  const toggleVibe = (vibe) => {
    const current = data.vibes || [];
    const next = current.includes(vibe)
      ? current.filter((v) => v !== vibe)
      : [...current, vibe];
    update({ vibes: next });
  };

  const intensity = data.intensity ?? 65;
  const intensityLabel =
    intensity < 35 ? "Subtle refresh"
    : intensity < 55 ? "Balanced redesign"
    : intensity < 75 ? "Bold transformation"
    : "Full reimagination";

  const intensityPct = ((intensity - 20) / 70) * 100;

  return (
    <div>
      {/* Style image grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {STYLES.map((s) => {
          const isSelected = data.style === s.name;
          return (
            <button
              key={s.name}
              onClick={() => update({ style: s.name, color_palette: s.palette })}
              className="relative rounded-2xl overflow-hidden cursor-pointer group text-left"
              style={{
                aspectRatio: "3/4",
                outline: isSelected ? `2px solid ${s.accent}` : "2px solid transparent",
                outlineOffset: 2,
                transform: isSelected ? "scale(1.03)" : "scale(1)",
                transition: "transform 0.25s ease, outline 0.2s ease, box-shadow 0.25s ease",
                boxShadow: isSelected ? `0 0 24px ${s.accent}55` : "none",
              }}
            >
              <img
                src={s.img}
                alt={s.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

              {isSelected && (
                <div
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: s.accent }}
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-sm font-bold text-white leading-tight tracking-tight">{s.name}</div>
                <div
                  className="text-[10px] mt-0.5 leading-snug transition-colors"
                  style={{ color: isSelected ? s.accent : "rgba(255,255,255,0.5)" }}
                >
                  {s.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected palette preview */}
      {data.style && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-white/35 text-xs font-medium flex-shrink-0">Active palette:</span>
          <span className="text-white/65 text-xs">{STYLES.find((s) => s.name === data.style)?.palette}</span>
        </div>
      )}

      {/* Color palette override */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-white/35 block mb-3 uppercase tracking-wider">
          Override color palette
        </label>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => {
            const isActive = data.color_palette === p.label;
            return (
              <button
                key={p.label}
                onClick={() => update({ color_palette: p.label })}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-all"
                style={{
                  borderColor: isActive ? p.dot : "rgba(255,255,255,0.1)",
                  background: isActive ? `${p.dot}20` : "transparent",
                  color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vibe tags */}
      <div className="mb-8">
        <label className="text-xs font-semibold text-white/35 block mb-3 uppercase tracking-wider">
          Mood &amp; vibes
          <span className="ml-2 text-white/20 font-normal normal-case tracking-normal">multi-select</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => {
            const active = (data.vibes || []).includes(v);
            return (
              <button
                key={v}
                onClick={() => toggleVibe(v)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all duration-200"
                style={{
                  borderColor: active ? "#f472b6" : "rgba(255,255,255,0.1)",
                  background: active ? "rgba(244,114,182,0.12)" : "transparent",
                  color: active ? "#f9a8d4" : "rgba(255,255,255,0.4)",
                  transform: active ? "scale(1.05)" : "scale(1)",
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transformation intensity */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-white/35 uppercase tracking-wider">
            Transformation intensity
          </label>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}
          >
            {intensityLabel}
          </span>
        </div>
        <div className="relative">
          <div className="h-2 rounded-full mb-1" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{ width: `${intensityPct}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }}
            />
          </div>
          <input
            type="range"
            min={20}
            max={90}
            value={intensity}
            onChange={(e) => update({ intensity: parseInt(e.target.value) })}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            style={{ height: 24, marginTop: -12 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/25 mt-1">
          <span>Keep character</span>
          <span>Full reimagination</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-2xl font-medium text-sm transition-all hover:bg-white/8"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!data.style}
          className="flex-1 py-4 rounded-2xl font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: data.style ? "linear-gradient(135deg, #7c3aed, #6d28d9)" : "rgba(124,58,237,0.3)",
            color: "#fff",
            boxShadow: data.style ? "0 8px 24px rgba(124,58,237,0.35)" : "none",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
