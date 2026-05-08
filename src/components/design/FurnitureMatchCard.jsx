import { useState } from "react";
import { apiClient } from "@/api/apiClient";
import { CheckCircle2, Recycle, ExternalLink } from "lucide-react";
import { buildAffiliateUrl, getSourceCTA } from "@/components/affiliateLinks";

function AmazonImage({ src, alt }) {
  const [proxied, setProxied] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  const imgSrc = proxied
    ? src  // direct fallback already tried
    : src; // try direct first (sometimes works)

  return (
    <div className="w-full h-28 rounded-xl overflow-hidden bg-white/5 mb-2">
      <img
        src={imgSrc}
        alt={alt}
        className="w-full h-full object-contain p-1 bg-white"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

const SOURCE_BADGE = {
  Amazon: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  IKEA:   "text-blue-400 bg-blue-400/10 border-blue-400/20",
  eBay:   "text-red-400 bg-red-400/10 border-red-400/20",
  Thrift: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

export default function FurnitureMatchCard({ item, onItemUpdate }) {
  const [selected, setSelected] = useState(item.selected_match_index ?? null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (idx) => {
    setSaving(true);
    setSelected(idx);
    await apiClient.entities.FurnitureItem.update(item.id, { selected_match_index: idx });
    onItemUpdate({ ...item, selected_match_index: idx });
    setSaving(false);
  };

  return (
    <div className="bg-white/3 border border-white/8 rounded-3xl p-6 flex flex-col gap-4">
      {/* Item header */}
      <div>
        <h3 className="font-semibold text-base">{item.label}</h3>
        <div className="flex flex-wrap gap-1 mt-2">
          {item.style_tags?.map((tag) => (
            <span key={tag} className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/40">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-white/30 uppercase tracking-wide font-medium">Top Matches</p>

      <div className="space-y-3">
        {(item.matches || []).map((match, idx) => {
          // Use url directly from SerpAPI response (has /dp/ASIN?tag=), or build it as fallback
          const affiliateUrl = match.url || buildAffiliateUrl(match);
          const cta = getSourceCTA(match.source);
          const isSelected = selected === idx;

          return (
            <div
              key={idx}
              onClick={() => handleSelect(idx)}
              className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 ${
                isSelected
                  ? "border-violet-500/60 bg-violet-500/8"
                  : "border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4"
              }`}
            >
              {/* Badges row.
                  Day 9.6 — removed the "X% match" badge. Detect & Shop
                  returns Amazon Associates / IKEA / Wayfair search-result
                  deep links, not exact-product matches, so we have no real
                  similarity score to display. The previous values (70/60/55%)
                  were hardcoded per-retailer slot and read as deceptive. */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SOURCE_BADGE[match.source] || "text-white/40 bg-white/5 border-white/10"}`}>
                  {match.source}
                </span>
                {match.is_preloved && (
                  <span className="text-xs flex items-center gap-1 text-emerald-400 bg-emerald-400/8 border border-emerald-400/15 px-2 py-0.5 rounded-full">
                    <Recycle className="w-2.5 h-2.5" /> Pre-loved
                  </span>
                )}
              </div>

              {/* Product image */}
              <AmazonImage src={match.image_url} alt={match.title} />

              {/* Title */}
              <p className="text-sm text-white/80 leading-snug line-clamp-2 mb-2">{match.title}</p>

              {/* Price (only shown when we actually have one — deep-link
                  matches don't, since real pricing is on the retailer page) */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  {match.price != null ? (
                    <span className="font-bold text-lg">${match.price.toLocaleString()}</span>
                  ) : (
                    <span className="text-white/40 text-sm">See price on {match.source}</span>
                  )}
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-400" />}
              </div>

              {/* Branded CTA */}
              <a
                href={affiliateUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={(e) => e.stopPropagation()}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm transition-colors active:opacity-60 ${cta.className}`}
              >
                {cta.label}* <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          );
        })}

        {(!item.matches || item.matches.length === 0) && (
          <div className="text-center py-8 text-white/25 text-sm">No matches found yet.</div>
        )}
      </div>

      {/* Affiliate disclosure (FTC requirement for US market) */}
      <p className="text-white/20 text-xs mt-2 leading-relaxed border-t border-white/5 pt-3">
        *These links are affiliate links. If you buy through them we may earn a small commission at no extra cost to you. Prices and availability are subject to change.
      </p>
    </div>
  );
}