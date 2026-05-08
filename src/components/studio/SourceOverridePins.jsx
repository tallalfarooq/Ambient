import { useState, useRef } from "react";
import { Paintbrush, X, MoveDiagonal, Lock, ArrowRightLeft, Plus } from "lucide-react";

/**
 * SourceOverridePins — interactive pin overlay on the user's source photo.
 *
 * Day 7.2 — gives users a way to mark specific surfaces / regions on their
 * source photo with edit instructions BEFORE generation. Each pin captures:
 *   - x, y — % coordinates of the click on the source image
 *   - action — one of: paint | swap | remove | preserve
 *   - detail — free text the user types ("dusty blue", "remove the lamp")
 *
 * Pins are translated into spatial-language instructions (Kontext doesn't
 * accept coordinates directly) by mapping (x,y) → "top-left", "back wall",
 * etc., then stitched into a single override sentence per pin and appended
 * to the prompt's user-instruction block.
 *
 * Why it matters: the structure-preservation prompt already keeps walls,
 * windows, floor identical. But users sometimes WANT to change one specific
 * thing (paint the back wall grey, remove a window, swap a couch) — and
 * typing that into a free-text box is friction. Clicking the spot you mean
 * is direct manipulation and matches users' mental model.
 */

const ACTIONS = [
  { id: "paint",    label: "Paint surface",  Icon: Paintbrush,    color: "#6EC6C6", placeholder: "e.g. dusty blue, sage green, charcoal" },
  { id: "swap",     label: "Swap furniture", Icon: ArrowRightLeft,color: "#C9963A", placeholder: "e.g. round walnut coffee table" },
  { id: "remove",   label: "Remove this",    Icon: X,             color: "#EF4444", placeholder: "e.g. remove this window" },
  { id: "preserve", label: "Don't touch",    Icon: Lock,          color: "#10B981", placeholder: "e.g. keep this exact lamp" },
];

/**
 * Map a click position on a 2D image to a spatial-language phrase Kontext
 * can interpret. We split the image into a 3x3 grid (corners + edges + center)
 * and pick the closest-fitting label. Empirically: spatial words like
 * "top-left", "right wall", "near the back" outperform raw coordinates.
 */
function spatialPhrase(x, y) {
  // x: left → right (0–100), y: top → bottom (0–100)
  const col = x < 33 ? "left" : x > 66 ? "right" : "center";
  // Top-third is usually walls/ceiling; bottom-third is usually floor/foreground.
  const row = y < 33 ? "upper" : y > 66 ? "lower" : "middle";
  if (y < 25) return col === "center" ? "back wall (top of frame)" : `${col} wall area near the top of the frame`;
  if (y > 75) return col === "center" ? "floor area in the foreground" : `${col} floor area in the foreground`;
  return `${row} ${col} of the room`;
}

/**
 * Convert pins to a single override sentence the prompt rewriter will pass
 * through verbatim via the custom_note flow.
 */
export function pinsToCustomNote(pins) {
  if (!pins || pins.length === 0) return "";
  const phrases = pins.map((p) => {
    const where = spatialPhrase(p.x, p.y);
    const detail = p.detail?.trim();
    switch (p.action) {
      case "paint":    return `Paint the ${where} ${detail || "in a fresh color"}`;
      case "swap":     return `Replace the item at the ${where} with ${detail || "a new piece in the chosen style"}`;
      case "remove":   return `Remove the element at the ${where}${detail ? ` (${detail})` : ""}`;
      case "preserve": return `Keep the ${where} EXACTLY as it is in the source photo${detail ? ` (${detail})` : ""}`;
      default:         return null;
    }
  }).filter(Boolean);
  return phrases.join(". ") + ".";
}

export default function SourceOverridePins({ imageUrl, pins, onChange }) {
  const containerRef = useRef(null);
  const [draftPin, setDraftPin] = useState(null); // {x, y} before action chosen

  if (!imageUrl) return null;

  const handleImageClick = (e) => {
    if (draftPin) return; // user is mid-pin — ignore stray clicks
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDraftPin({ x, y, action: null, detail: "" });
  };

  const commitPin = () => {
    if (!draftPin || !draftPin.action) return;
    onChange([...pins, { ...draftPin, id: Date.now() }]);
    setDraftPin(null);
  };

  const removePin = (id) => onChange(pins.filter((p) => p.id !== id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-white/55">
          Click the photo to mark specific changes
        </p>
        <span className="ml-auto text-[10px] text-white/30">{pins.length} pin{pins.length !== 1 ? "s" : ""}</span>
      </div>

      <div
        ref={containerRef}
        onClick={handleImageClick}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 cursor-crosshair"
        style={{ background: "rgba(20,20,24,0.4)" }}
      >
        <img
          src={imageUrl}
          alt="Source room — click to add edit pin"
          className="w-full h-full object-cover pointer-events-none select-none"
          draggable={false}
        />

        {/* Existing pins */}
        {pins.map((pin, idx) => {
          const action = ACTIONS.find((a) => a.id === pin.action);
          if (!action) return null;
          const { Icon, color } = action;
          return (
            <div
              key={pin.id}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg"
                style={{ background: color, border: "2px solid white" }}
                title={`${action.label}${pin.detail ? `: ${pin.detail}` : ""}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <button
                onClick={() => removePin(pin.id)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/80 border border-white/40 flex items-center justify-center"
                title="Remove pin"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
          );
        })}

        {/* Draft pin — being created */}
        {draftPin && (
          <div
            style={{ left: `${draftPin.x}%`, top: `${draftPin.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-7 h-7 rounded-full bg-white border-2 flex items-center justify-center"
              style={{ borderColor: "#1B8FA0" }}>
              <Plus className="w-4 h-4" style={{ color: "#1B8FA0" }} />
            </div>
          </div>
        )}

        {pins.length === 0 && !draftPin && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(0,0,0,0.35)" }}
          >
            <div className="text-center px-6">
              <MoveDiagonal className="w-8 h-8 text-white/55 mx-auto mb-2" />
              <p className="text-sm text-white/85 font-semibold">
                Click anywhere to mark a specific change
              </p>
              <p className="text-xs text-white/55 mt-1">
                Optional — skip if you want a full restyle
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Draft pin action picker */}
      {draftPin && (
        <div className="rounded-2xl px-4 py-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(110,198,198,0.25)" }}>
          <p className="text-xs text-white/55">
            What should AI do at this spot?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map(({ id, label, Icon, color }) => (
              <button
                key={id}
                onClick={() => setDraftPin({ ...draftPin, action: id })}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={
                  draftPin.action === id
                    ? { background: `${color}26`, border: `1px solid ${color}66`, color }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }
                }
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          {draftPin.action && (
            <input
              type="text"
              autoFocus
              value={draftPin.detail || ""}
              onChange={(e) => setDraftPin({ ...draftPin, detail: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") commitPin(); }}
              placeholder={ACTIONS.find((a) => a.id === draftPin.action)?.placeholder}
              className="w-full text-sm px-3 py-2.5 rounded-xl text-white/85 placeholder-white/25 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDraftPin(null)}
              className="text-xs px-3 py-1.5 rounded-xl text-white/55 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={commitPin}
              disabled={!draftPin.action}
              className="ml-auto text-xs font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
            >
              Add pin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
