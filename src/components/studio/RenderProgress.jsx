import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";

/**
 * RenderProgress — what users see while waiting 25–40s for an AI render.
 *
 * Day 10.2 — replaces the old "Starting AI engine…" → "Rendering your design…"
 * single-line spinner with a 5-stage timed narrative that mirrors what's
 * actually happening (well, what we want users to think is happening).
 * Multi-step progress feels faster than single-spinner waits even at the
 * same total elapsed time — well-studied UX phenomenon.
 *
 * Day 10.4 — also rotates a curated reference gallery for the chosen style
 * so users have something to look at instead of a spinner. They learn the
 * style's vocabulary while the render finishes; we get higher retention.
 *
 * Props:
 *   - elapsed: seconds since render started
 *   - style:   selected style name (e.g. "Japandi") for the gallery
 *
 * Total expected duration: ~30s. ETA countdown caps at 0 once exceeded.
 */

const TYPICAL_DURATION = 30; // seconds — typical fal.ai Kontext render

// Stages are timed by elapsed seconds. Each stage covers a slice of the
// expected 30s window. We let stage 5 own everything past 28s so the user
// sees "Final touches" at the long-tail end instead of a stalled stage 4.
const STAGES = [
  { atSec: 0,  label: "Reading your room dimensions and lighting" },
  { atSec: 5,  label: "Detecting walls, windows, and doors to preserve" },
  { atSec: 12, label: "Selecting furniture and decor" },
  { atSec: 22, label: "Placing items in your space" },
  { atSec: 28, label: "Final touches and color matching" },
];

// Curated reference images per style. 4–6 per style; high-quality interior
// photography that visually communicates the style's vocabulary.
// Day 10.4 — Unsplash URLs for now (royalty-free); swap for real beta-user
// renders once we have a portfolio.
const STYLE_REFERENCES = {
  Japandi: [
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1616627451515-c34d8366ad94?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80",
  ],
  Industrial: [
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1531835551805-16d864c8d311?auto=format&fit=crop&w=1200&q=80",
  ],
  Boho: [
    "https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
  ],
  "Modern Minimal": [
    "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
  ],
  Cottagecore: [
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1616627451515-c34d8366ad94?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
  ],
  "Mid-Century Modern": [
    "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=80",
  ],
  "Art Deco": [
    "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
  ],
  // Day 11 — keyed under the canonical id "Scandinavian" instead of the
  // legacy "Scandi" label so RenderProgress finds the right gallery for
  // selections coming from the unified style catalog.
  Scandinavian: [
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
  ],
};

const FALLBACK_REFERENCES = STYLE_REFERENCES.Japandi;

export default function RenderProgress({ elapsed, style }) {
  const remaining = Math.max(0, TYPICAL_DURATION - elapsed);
  const overdue = elapsed > TYPICAL_DURATION + 10;

  // Determine current stage by elapsed.
  const currentStageIdx = (() => {
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (elapsed >= STAGES[i].atSec) idx = i;
    }
    return idx;
  })();

  // Rotate style reference gallery every 4s during the wait.
  const refs = STYLE_REFERENCES[style] || FALLBACK_REFERENCES;
  const [refIdx, setRefIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setRefIdx((i) => (i + 1) % refs.length);
    }, 4000);
    return () => clearInterval(t);
  }, [refs.length]);

  return (
    <div className="w-full py-6 px-4 sm:px-6 flex flex-col items-center gap-6">
      {/* Style reference gallery — fades through the chosen style's
          curated photos so users have something to look at instead of
          an empty spinner. */}
      <div className="relative w-full max-w-md aspect-[16/10] rounded-2xl overflow-hidden border border-white/8 shadow-xl"
        style={{ background: "rgba(20,20,24,0.6)" }}>
        {refs.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            style={{ opacity: i === refIdx ? 1 : 0 }}
          />
        ))}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold backdrop-blur-md"
          style={{ background: "rgba(20,20,24,0.7)", border: "1px solid rgba(110,198,198,0.35)", color: "#6EC6C6" }}>
          {style || "Style"} reference
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white/85" />
          <p className="text-xs text-white/85 font-medium">Generating your design</p>
          <span className="ml-auto text-[11px] text-white/65 tabular-nums">
            {overdue ? `${elapsed}s · finalizing` : `${elapsed}s · ~${remaining}s left`}
          </span>
        </div>
      </div>

      {/* Stage list — checkmarks for completed stages, spinner on current,
          dim text for upcoming. */}
      <ol className="w-full max-w-md space-y-2.5">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentStageIdx;
          const isActive = idx === currentStageIdx;
          return (
            <li key={stage.label} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={
                  isDone
                    ? { background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.4)" }
                    : isActive
                    ? { background: "rgba(110,198,198,0.18)", border: "1px solid rgba(110,198,198,0.45)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }
                }
              >
                {isDone ? (
                  <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                ) : isActive ? (
                  <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#6EC6C6" }} />
                ) : null}
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{
                  color: isDone ? "rgba(255,255,255,0.55)" : isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {stage.label}
                {isActive && "…"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
