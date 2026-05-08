import { useState } from "react";
import { Loader2, Check, Sparkles, X } from "lucide-react";

/**
 * VariantGrid — 2x2 grid of "Compare 4 styles" results.
 *
 * Day 8.4 — surfaced from StepGenerate when the user clicks "Compare 4 styles".
 * Each tile shows one rendered variant. Clicking a tile makes it the active
 * choice and replaces the main render in the parent flow.
 *
 * States:
 *   - idle (no variants yet) → CTA card with "Try 4 styles · 8 credits"
 *   - loading → 4 placeholder tiles with progress shimmer
 *   - rendered → 4 thumbnails, click to select + adopt as primary
 */
export default function VariantGrid({ variants, loading, onSelect, onClose, selectedUrl }) {
  const tiles = variants.length === 0 && loading
    ? Array(4).fill(null).map((_, i) => ({ loading: true, key: `loading-${i}` }))
    : variants;

  return (
    <div className="rounded-3xl border border-white/10 overflow-hidden mb-5"
      style={{ background: "rgba(20,20,24,0.6)" }}>
      <div className="px-5 py-3 flex items-center gap-2 border-b border-white/8">
        <Sparkles className="w-3.5 h-3.5" style={{ color: "#C9963A" }} />
        <p className="text-xs font-bold uppercase tracking-wider text-white/65">
          Compare 4 styles
        </p>
        {loading && variants.length === 0 && (
          <span className="ml-2 text-[11px] text-white/40 inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> rendering 4 variants in parallel…
          </span>
        )}
        <button
          onClick={onClose}
          className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/8 transition-all"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3">
        {tiles.map((variant, idx) => {
          if (variant.loading) {
            return (
              <div key={variant.key} className="relative aspect-[4/3] rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            );
          }
          const isSelected = selectedUrl && variant.url === selectedUrl;
          return (
            <button
              key={variant.id || idx}
              onClick={() => onSelect(variant)}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden group transition-all"
              style={{
                outline: isSelected ? "2px solid #6EC6C6" : "2px solid transparent",
                outlineOffset: 2,
              }}
            >
              <img src={variant.url} alt={variant.style} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
                <span className="text-xs font-bold text-white drop-shadow-lg">{variant.style}</span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#6EC6C6", color: "#0A0A12" }}>
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {variants.length > 0 && (
        <div className="px-5 py-3 border-t border-white/8 text-[11px] text-white/40">
          Click a variant to make it your primary design. You can still iterate, fine-tune, and shop from any one.
        </div>
      )}
    </div>
  );
}
