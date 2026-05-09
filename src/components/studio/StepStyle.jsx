import { Check, Blend } from "lucide-react";
// Day 11 — single source of truth for style catalog.
// Previously this file had its own STYLES list with `name: "Scandi"` while
// the server's VALID_STYLES expected "Scandinavian"; that mismatch broke
// /api/generateVariants for any user who picked "Scandi". Now everyone
// imports from src/lib/styles.js.
import { STYLES as CANON_STYLES } from "@/lib/styles";

const STYLES = CANON_STYLES;

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
          // Day 11 — `data.style` is the canonical id (e.g. "Scandinavian"),
          // sent verbatim to the server. `s.label` is the short user-facing
          // text on the card.
          const isSelected = data.style === s.id;
          return (
            <button
              key={s.id}
              onClick={() => update({ style: s.id, color_palette: s.palette })}
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
                alt={s.label}
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
                <div className="text-sm font-bold text-white leading-tight tracking-tight">{s.label}</div>
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
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-white/35 text-xs font-medium flex-shrink-0">Active palette:</span>
          <span className="text-white/65 text-xs">{STYLES.find((s) => s.id === data.style)?.palette}</span>
        </div>
      )}

      {/* Day 8.3 — Style mixing. Lets the user blend two styles in any ratio.
          Off by default to keep the wizard simple; opens via a toggle once a
          primary style is selected. The blend ratio is encoded in the prompt
          via the buildPrompt helper in StepGenerate.jsx. */}
      {data.style && (
        <div className="mb-6 rounded-2xl px-4 py-4"
          style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${data.secondary_style ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.08)"}` }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: data.secondary_style ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.05)" }}>
              <Blend className="w-3.5 h-3.5" style={{ color: data.secondary_style ? "#a78bfa" : "rgba(255,255,255,0.45)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Mix two styles</p>
              <p className="text-[11px] text-white/40">Blend {data.style} with a second style for a unique look</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (data.secondary_style) {
                  update({ secondary_style: null, style_blend_pct: null });
                } else {
                  // Default to next style in the list, 50/50 blend
                  const next = STYLES.find((s) => s.id !== data.style)?.id;
                  update({ secondary_style: next, style_blend_pct: 50 });
                }
              }}
              className="w-10 h-5 rounded-full relative transition-all"
              style={{ background: data.secondary_style ? "#a78bfa" : "rgba(255,255,255,0.12)" }}
              aria-label="Toggle style mixing"
            >
              <span
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: data.secondary_style ? "calc(100% - 18px)" : "2px" }}
              />
            </button>
          </div>

          {data.secondary_style && (
            <div className="mt-4 space-y-3">
              {/* Secondary style picker — compact chip list */}
              <div className="flex flex-wrap gap-2">
                {STYLES.filter((s) => s.id !== data.style).map((s) => {
                  const active = data.secondary_style === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => update({ secondary_style: s.id })}
                      className="text-xs px-3 py-1.5 rounded-full border transition-all"
                      style={
                        active
                          ? { borderColor: s.accent, background: `${s.accent}26`, color: "white" }
                          : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }
                      }
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Blend slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/55 font-semibold">{data.style}</span>
                  <span className="text-[11px] font-bold" style={{ color: "#a78bfa" }}>
                    {100 - (data.style_blend_pct ?? 50)}% / {data.style_blend_pct ?? 50}%
                  </span>
                  <span className="text-[11px] text-white/55 font-semibold">{data.secondary_style}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={data.style_blend_pct ?? 50}
                  onChange={(e) => update({ style_blend_pct: parseInt(e.target.value) })}
                  className="w-full"
                  style={{ accentColor: "#a78bfa" }}
                />
              </div>
            </div>
          )}
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
