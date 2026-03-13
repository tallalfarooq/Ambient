import { useState } from "react";
import { Recycle, ShoppingBag, Sparkles, Package } from "lucide-react";

const PRESETS = [
  {
    label: "Thrifty",
    min: 200,   max: 800,   perItem: 50,
    tier: "budget",
    icon: "♻️",
    desc: "Smart finds & pre-loved gems",
    color: "#6B9E6B",
    bars: 1,
  },
  {
    label: "Mid-range",
    min: 800,   max: 2500,  perItem: 200,
    tier: "mid",
    icon: "🛋️",
    desc: "Quality pieces, great value",
    color: "#7090B0",
    bars: 2,
  },
  {
    label: "Premium",
    min: 2500,  max: 8000,  perItem: 600,
    tier: "premium",
    icon: "✨",
    desc: "Designer-quality furniture",
    color: "#8B5CF6",
    bars: 3,
  },
  {
    label: "Luxury",
    min: 8000,  max: 25000, perItem: 2000,
    tier: "luxury",
    icon: "👑",
    desc: "Top-tier, curated exclusives",
    color: "#C9A96E",
    bars: 4,
  },
];

const SOURCES = [
  { id: "amazon", label: "Amazon",  emoji: "📦", available: true,  hint: "Live — ships to 170+ countries" },
  { id: "ikea",   label: "IKEA",    emoji: "🟡", available: false, hint: "Coming soon"                     },
  { id: "ebay",   label: "eBay",    emoji: "🔴", available: false, hint: "Coming soon"                     },
  { id: "thrift", label: "Thrift",  emoji: "♻️", available: false, hint: "Coming soon"                     },
];

export default function StepBudget({ data, update, onNext, onBack }) {
  const activeSources = data.shopping_sources?.length
    ? data.shopping_sources
    : ["amazon"];

  const toggleSource = (id) => {
    const source = SOURCES.find((s) => s.id === id);
    if (!source?.available) return;
    const next = activeSources.includes(id)
      ? activeSources.filter((s) => s !== id)
      : [...activeSources, id];
    update({ shopping_sources: next.length ? next : ["amazon"] });
  };

  const selectedPreset = PRESETS.find(
    (p) => data.budget_min === p.min && data.budget_max === p.max
  );

  return (
    <div>
      {/* Budget tier cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {PRESETS.map((p) => {
          const isActive = data.budget_min === p.min && data.budget_max === p.max;
          return (
            <button
              key={p.label}
              onClick={() => update({ budget_min: p.min, budget_max: p.max, budget_tier: p.tier })}
              className="relative text-left px-4 py-4 rounded-2xl border transition-all duration-200 overflow-hidden"
              style={{
                borderColor: isActive ? p.color : "rgba(255,255,255,0.08)",
                background: isActive ? `${p.color}15` : "rgba(255,255,255,0.03)",
                boxShadow: isActive ? `0 0 20px ${p.color}25` : "none",
                transform: isActive ? "scale(1.02)" : "scale(1)",
              }}
            >
              {/* Budget bars */}
              <div className="flex items-end gap-0.5 mb-3 h-5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-sm transition-all duration-200"
                    style={{
                      height: `${i * 20 + 20}%`,
                      background: i <= p.bars
                        ? isActive ? p.color : "rgba(255,255,255,0.3)"
                        : "rgba(255,255,255,0.07)",
                    }}
                  />
                ))}
              </div>

              <div className="text-base mb-0.5">{p.icon}</div>
              <div
                className="font-bold text-sm"
                style={{ color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)" }}
              >
                {p.label}
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: isActive ? p.color : "rgba(255,255,255,0.3)" }}
              >
                €{p.min.toLocaleString()} – €{p.max.toLocaleString()}
              </div>
              <div className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                {p.desc}
              </div>

              {isActive && (
                <div
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: p.color }}
                >
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom range */}
      <div className="mb-6">
        <label className="text-[11px] font-semibold text-white/35 block mb-2.5 uppercase tracking-wider">
          Custom range
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/30 block mb-1">Min (€)</label>
            <input
              type="number"
              value={data.budget_min}
              onChange={(e) => update({ budget_min: parseInt(e.target.value) })}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
            />
          </div>
          <div>
            <label className="text-xs text-white/30 block mb-1">Max (€)</label>
            <input
              type="number"
              value={data.budget_max}
              onChange={(e) => update({ budget_max: parseInt(e.target.value) })}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
            />
          </div>
        </div>
      </div>

      {/* AI cost hint */}
      {selectedPreset && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="text-white/45 text-xs">
            AI will target ~<span className="text-white/70 font-medium">€{selectedPreset.perItem.toLocaleString()}</span> per furniture item for the <span className="text-white/70 font-medium">{selectedPreset.label}</span> tier.
          </span>
        </div>
      )}

      {/* Shopping sources */}
      <div className="mb-6">
        <label className="text-[11px] font-semibold text-white/35 block mb-2.5 uppercase tracking-wider">
          Shop from
        </label>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => {
            const isActive = activeSources.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                disabled={!s.available}
                title={s.hint}
                className="relative flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all"
                style={{
                  borderColor: !s.available
                    ? "rgba(255,255,255,0.06)"
                    : isActive
                    ? "rgba(124,58,237,0.6)"
                    : "rgba(255,255,255,0.1)",
                  background: !s.available
                    ? "rgba(255,255,255,0.01)"
                    : isActive
                    ? "rgba(124,58,237,0.12)"
                    : "transparent",
                  color: !s.available
                    ? "rgba(255,255,255,0.2)"
                    : isActive
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.45)",
                  cursor: !s.available ? "not-allowed" : "pointer",
                  opacity: !s.available ? 0.5 : 1,
                }}
              >
                {s.emoji} {s.label}
                {!s.available && (
                  <span className="ml-1 text-[9px] bg-white/10 text-white/30 rounded px-1.5 py-0.5 font-medium">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sustainability toggle */}
      <button
        onClick={() => update({ sustainability_mode: !data.sustainability_mode })}
        className="w-full flex items-center gap-4 p-5 rounded-2xl border transition-all mb-7"
        style={{
          borderColor: data.sustainability_mode ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)",
          background: data.sustainability_mode ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.02)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={{ background: data.sustainability_mode ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.05)" }}
        >
          <Recycle
            className="w-5 h-5 transition-colors"
            style={{ color: data.sustainability_mode ? "#34d399" : "rgba(255,255,255,0.25)" }}
          />
        </div>
        <div className="text-left flex-1">
          <div className="font-semibold text-sm text-white/85">Pre-Loved Priority</div>
          <div className="text-white/35 text-xs mt-0.5">
            Prioritise thrift &amp; second-hand listings for eco-friendly choices
          </div>
        </div>
        <div
          className="w-11 h-6 rounded-full transition-all shrink-0 relative"
          style={{ background: data.sustainability_mode ? "#10b981" : "rgba(255,255,255,0.12)" }}
        >
          <div
            className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
            style={{ left: data.sustainability_mode ? "22px" : "2px" }}
          />
        </div>
      </button>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-2xl font-medium text-sm transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-4 rounded-2xl font-semibold text-sm text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            boxShadow: "0 8px 24px rgba(124,58,237,0.35)",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
