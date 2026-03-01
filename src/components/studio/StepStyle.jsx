const STYLES = [
  { name: "Japandi", emoji: "🪴", desc: "Calm, natural, wabi-sabi meets Scandi", palette: "Sage greens, warm whites, natural oak" },
  { name: "Industrial", emoji: "⚙️", desc: "Raw steel, exposed brick, utilitarian", palette: "Gunmetal, rust, weathered wood" },
  { name: "Boho", emoji: "🌿", desc: "Layered textiles, rattan, global prints", palette: "Terracotta, burnt orange, cream" },
  { name: "Modern Minimal", emoji: "◻️", desc: "Clean lines, negative space, purpose", palette: "White, greige, matte black" },
  { name: "Cottagecore", emoji: "🌸", desc: "Floral, soft light, lived-in comfort", palette: "Blush, dusty rose, sage" },
  { name: "Mid-Century Modern", emoji: "🪑", desc: "Organic shapes, warm walnut, vintage charm", palette: "Mustard, avocado, warm brown" },
  { name: "Art Deco", emoji: "✦", desc: "Bold geometry, gold accents, glamour", palette: "Black, gold, emerald" },
  { name: "Scandi", emoji: "❄️", desc: "Hygge warmth, clean simplicity", palette: "White, birch, soft blues" },
];

const PALETTES = [
  "Neutral & Warm",
  "Cool & Calm",
  "Bold & Vibrant",
  "Earthy & Natural",
  "Monochrome",
  "Pastel Soft",
];

const VIBES = [
  "Cosy", "Airy", "Dark & moody", "Light-filled", "Luxurious",
  "Rustic", "Futuristic", "Romantic", "Playful", "Zen",
];

export default function StepStyle({ data, update, onNext, onBack }) {
  const toggleVibe = (vibe) => {
    const current = data.vibes || [];
    const next = current.includes(vibe) ? current.filter(v => v !== vibe) : [...current, vibe];
    update({ vibes: next });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Choose your style</h2>
      <p className="text-white/40 text-sm mb-8">
        Each style runs a dedicated LoRA model for maximum fidelity.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {STYLES.map((s) => (
          <button
            key={s.name}
            onClick={() => update({ style: s.name, color_palette: s.palette })}
            className={`text-left p-5 rounded-2xl border transition-all duration-200 ${
              data.style === s.name
                ? "border-violet-500 bg-violet-500/10"
                : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6"
            }`}
          >
            <div className="text-2xl mb-2">{s.emoji}</div>
            <div className="font-semibold text-sm mb-1">{s.name}</div>
            <div className="text-white/35 text-xs leading-relaxed">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Color palette override */}
      <div className="mb-8">
        <label className="text-xs text-white/40 block mb-3">Override color palette (optional)</label>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => (
            <button
              key={p}
              onClick={() => update({ color_palette: p })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                data.color_palette === p
                  ? "border-violet-500 text-violet-400 bg-violet-500/10"
                  : "border-white/10 text-white/40 hover:border-white/20"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-white/5 border border-white/10 text-white/70 py-4 rounded-2xl hover:bg-white/8 transition-colors font-medium">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!data.style}
          className="flex-1 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}