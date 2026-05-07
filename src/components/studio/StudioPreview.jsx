import { useEffect, useState } from "react";
import { Image as ImageIcon, Sparkles, Layers, DollarSign, Palette } from "lucide-react";

/**
 * StudioPreview — persistent sidebar that lives next to the wizard on
 * desktop. Fills the previously-empty side space with useful context:
 *   - Room photo preview (when uploaded)
 *   - Selection summary (room type · style · budget · vibes)
 *
 * On mobile this component is hidden entirely; the wizard goes full-width.
 *
 * Reads from the same `data` object the wizard passes around. Doesn't mutate
 * anything — purely a passive view of current state.
 */

function StatRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-white/5 last:border-b-0">
      <div className="flex items-center gap-2.5 text-white/45">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.2} />
        <span className="text-caption">{label}</span>
      </div>
      <span className="text-caption font-semibold text-white/85 truncate max-w-[60%] text-right">
        {value || <span className="text-white/25 italic">Not set</span>}
      </span>
    </div>
  );
}

export default function StudioPreview({ data }) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if user uploads a new image
  useEffect(() => {
    setImgError(false);
  }, [data.room_image_url]);

  const formatBudget = () => {
    if (!data.budget_min && !data.budget_max) return null;
    if (data.budget_max) return `Up to $${Number(data.budget_max).toLocaleString()}`;
    return null;
  };

  const formatVibes = () => {
    if (!data.vibes || data.vibes.length === 0) return null;
    return data.vibes.slice(0, 3).join(" · ");
  };

  const hasPhoto = data.room_image_url && !imgError;

  return (
    <aside className="sticky top-24 w-full flex flex-col gap-5">
      {/* Photo preview pane */}
      <div
        className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden border border-white/8"
        style={{ background: "rgba(20,20,24,0.6)" }}
      >
        {hasPhoto ? (
          <>
            <img
              src={data.room_image_url}
              alt="Your room"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
            />
            <div className="absolute top-4 left-4">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full backdrop-blur-md"
                style={{
                  background: "rgba(20,20,24,0.7)",
                  border: "1px solid rgba(110,198,198,0.35)",
                  color: "#6EC6C6",
                }}
              >
                <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                Your Room
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(27,143,160,0.1)",
                border: "1px solid rgba(27,143,160,0.2)",
              }}
            >
              <ImageIcon className="w-6 h-6 text-accent-teal-light" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-caption text-white/55 leading-relaxed max-w-[200px]">
                Upload a room photo to see your live preview here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selection summary */}
      <div
        className="rounded-3xl border border-white/8 px-5 py-4"
        style={{ background: "rgba(20,20,24,0.6)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-eyebrow uppercase text-white/35">Your selections</span>
        </div>

        <StatRow icon={Layers} label="Room type" value={data.room_type} />
        <StatRow icon={Palette} label="Style" value={data.style} />
        <StatRow icon={DollarSign} label="Budget" value={formatBudget()} />
        <StatRow icon={Sparkles} label="Vibes" value={formatVibes()} />
      </div>
    </aside>
  );
}
