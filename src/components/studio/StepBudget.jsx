import { useState } from "react";
import { Recycle, ShoppingBag } from "lucide-react";

const PRESETS = [
  { label: "Thrifty",    min: 200,   max: 800,   perItem: 50,   tier: "budget"  },
  { label: "Mid-range",  min: 800,   max: 2500,  perItem: 200,  tier: "mid"     },
  { label: "Premium",    min: 2500,  max: 8000,  perItem: 600,  tier: "premium" },
  { label: "Luxury",     min: 8000,  max: 25000, perItem: 2000, tier: "luxury"  },
];

const SOURCES = [
  { id: "amazon", label: "Amazon", emoji: "📦", available: true,  hint: "Live — ships to 170+ countries"   },
  { id: "ikea",   label: "IKEA",   emoji: "🟡", available: false, hint: "Coming soon"                       },
  { id: "ebay",   label: "eBay",   emoji: "🔴", available: false, hint: "Coming soon"                       },
  { id: "thrift", label: "Thrift", emoji: "♻️", available: false, hint: "Coming soon"                       },
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Set your budget</h2>
      <p className="text-white/40 text-sm mb-8">
        We'll match AI-generated furniture to real listings within your range.
      </p>

      {/* Presets */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => update({ budget_min: p.min, budget_max: p.max, budget_tier: p.tier })}
            className={`text-left px-5 py-4 rounded-2xl border transition-all ${
              data.budget_min === p.min && data.budget_max === p.max
                ? "border-violet-500 bg-violet-500/10"
                : "border-white/8 bg-white/3 hover:border-white/20"
            }`}
          >
            <div className="font-semibold text-sm">{p.label}</div>
            <div className="text-white/35 text-xs mt-0.5">
              €{p.min.toLocaleString()} – €{p.max.toLocaleString()}
            </div>
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div>
          <label className="text-xs text-white/40 block mb-1">Min (€)</label>
          <input
            type="number"
            value={data.budget_min}
            onChange={(e) => update({ budget_min: parseInt(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm
                       text-white focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <div>
          <label className="text-xs text-white/40 block mb-1">Max (€)</label>
          <input
            type="number"
            value={data.budget_max}
            onChange={(e) => update({ budget_max: parseInt(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm
                       text-white focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Shopping sources */}
      <div className="mb-8">
        <label className="text-xs text-white/40 block mb-3">Shop from</label>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => {
            const isActive = activeSources.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                disabled={!s.available}
                title={s.hint}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all ${
                  !s.available
                    ? "border-white/8 text-white/25 bg-white/2 cursor-not-allowed opacity-50"
                    : isActive
                    ? "border-violet-500 bg-violet-500/10 text-white"
                    : "border-white/10 text-white/40 hover:border-white/20"
                }`}
              >
                {s.emoji} {s.label}
                {!s.available && (
                  <span className="ml-1 text-[9px] bg-white/10 text-white/35 rounded px-1 py-0.5 font-medium">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-white/25 text-xs mt-2">More stores launching soon.</p>
      </div>

      {/* Sustainability toggle */}
      <button
        onClick={() => update({ sustainability_mode: !data.sustainability_mode })}
        className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all mb-8 ${
          data.sustainability_mode
            ? "border-emerald-500/50 bg-emerald-500/8"
            : "border-white/8 bg-white/3 hover:border-white/15"
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.sustainability_mode ? "bg-emerald-500/20" : "bg-white/5"}`}>
          <Recycle className={`w-5 h-5 ${data.sustainability_mode ? "text-emerald-400" : "text-white/30"}`} />
        </div>
        <div className="text-left">
          <div className="font-medium text-sm">Pre-Loved Priority</div>
          <div className="text-white/35 text-xs mt-0.5">Prioritise thrift &amp; second-hand listings for eco-friendly choices</div>
        </div>
        <div className={`ml-auto w-11 h-6 rounded-full transition-colors ${data.sustainability_mode ? "bg-emerald-500" : "bg-white/15"}`}>
          <div className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${data.sustainability_mode ? "translate-x-5.5 ml-0.5" : "ml-0.5"}`} />
        </div>
      </button>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-white/5 border border-white/10 text-white/70 py-4 rounded-2xl
                     hover:bg-white/8 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-violet-500 hover:bg-violet-400 text-white font-semibold py-4
                     rounded-2xl transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}