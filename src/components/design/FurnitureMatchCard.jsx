import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ExternalLink, CheckCircle2, Recycle, Star } from "lucide-react";

const SOURCE_COLORS = {
  Amazon: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  IKEA: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  eBay: "text-red-400 bg-red-400/10 border-red-400/20",
  Thrift: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

export default function FurnitureMatchCard({ item, onItemUpdate }) {
  const [selected, setSelected] = useState(item.selected_match_index ?? null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (idx) => {
    setSaving(true);
    setSelected(idx);
    const updated = await base44.entities.FurnitureItem.update(item.id, { selected_match_index: idx });
    onItemUpdate({ ...item, selected_match_index: idx });
    setSaving(false);
  };

  return (
    <div className="bg-white/3 border border-white/8 rounded-3xl p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-base">{item.label}</h3>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.style_tags?.map((tag) => (
            <span key={tag} className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/40">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/30 mb-4 uppercase tracking-wide font-medium">Top Matches</p>

      <div className="space-y-3">
        {(item.matches || []).map((match, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
              selected === idx
                ? "border-violet-500/60 bg-violet-500/8"
                : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SOURCE_COLORS[match.source] || "text-white/40 bg-white/5 border-white/10"}`}>
                    {match.source}
                  </span>
                  {match.is_preloved && (
                    <span className="text-xs flex items-center gap-1 text-emerald-400 bg-emerald-400/8 border border-emerald-400/15 px-2 py-0.5 rounded-full">
                      <Recycle className="w-2.5 h-2.5" /> Pre-loved
                    </span>
                  )}
                  {match.similarity_score && (
                    <span className="text-xs flex items-center gap-1 text-amber-400/70">
                      <Star className="w-2.5 h-2.5" /> {Math.round(match.similarity_score * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/80 leading-snug line-clamp-2">{match.title}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-bold text-sm">
                  £{match.price?.toLocaleString()}
                </span>
                {selected === idx && (
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                )}
              </div>
            </div>

            <a
              href={match.url || `https://www.amazon.co.uk/s?k=${encodeURIComponent(match.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex items-center gap-1.5 text-xs text-violet-400/60 hover:text-violet-400 transition-colors font-medium"
            >
              <ExternalLink className="w-3 h-3" /> Shop this product →
            </a>
          </button>
        ))}

        {(!item.matches || item.matches.length === 0) && (
          <div className="text-center py-8 text-white/25 text-sm">
            No matches found yet.
          </div>
        )}
      </div>
    </div>
  );
}