import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, ShoppingBag, Sparkles, ExternalLink, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { getAffiliateLink, getAffiliateButtonStyle } from "@/components/affiliateLinks";

function BeforeAfterSlider({ before, after }) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);

  const clamp = (v) => Math.max(0, Math.min(100, v));
  const updateFromClientX = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none cursor-ew-resize"
      onMouseDown={(e)  => { setDragging(true);  updateFromClientX(e.clientX); }}
      onMouseMove={(e)  => { if (dragging) updateFromClientX(e.clientX); }}
      onMouseUp={()     => setDragging(false)}
      onMouseLeave={()  => setDragging(false)}
      onTouchStart={(e) => { setDragging(true);  updateFromClientX(e.touches[0].clientX); }}
      onTouchMove={(e)  => { if (dragging) updateFromClientX(e.touches[0].clientX); }}
      onTouchEnd={()    => setDragging(false)}
    >
      <img src={after} alt="After" draggable={false} className="w-full h-auto block pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt="Before"
          draggable={false}
          className="absolute inset-0 h-full object-cover pointer-events-none"
          style={{ width: containerRef.current?.offsetWidth ?? "100%" }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-xl flex items-center justify-center pointer-events-none">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5">
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
          </svg>
        </div>
      </div>
      <span className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/70 pointer-events-none">Before</span>
      <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-600/80 backdrop-blur-sm text-white pointer-events-none">After ✦</span>
    </div>
  );
}

export default function SharedDesign() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [design, setDesign] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSharedDesign = async () => {
      if (!token) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        const saved = await base44.entities.SavedDesign.filter({ share_token: token, is_public: true });
        if (saved.length === 0) {
          setError("Design not found or not shared publicly");
          setLoading(false);
          return;
        }

        const designData = await base44.entities.RoomDesign.filter({ id: saved[0].design_id });
        if (designData.length === 0) {
          setError("Design not found");
          setLoading(false);
          return;
        }

        setDesign(designData[0]);

        const furnitureItems = await base44.entities.FurnitureItem.filter({ design_id: saved[0].design_id });
        setItems(furnitureItems);
      } catch (err) {
        setError("Failed to load design");
        console.error(err);
      }
      setLoading(false);
    };

    loadSharedDesign();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
          <Layers className="w-8 h-8 text-white/20" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{error || "Design not found"}</h1>
        <p className="text-white/40 mb-6 text-center max-w-md">
          This design may have been removed or is no longer shared publicly.
        </p>
        <Link
          to={createPageUrl("Home")}
          className="bg-violet-500 hover:bg-violet-400 text-white px-6 py-3 rounded-2xl font-semibold transition-colors"
        >
          Create Your Own Design
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">{design.name}</h1>
            <p className="text-white/35 text-xs">
              {design.style} · €{design.budget_min?.toLocaleString()}–€{design.budget_max?.toLocaleString()}
            </p>
          </div>
          <Link
            to={createPageUrl("Home")}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            Create Your Own
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Banner */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold mb-1">AI-Generated Interior Design</h2>
              <p className="text-white/40 text-sm">
                This room was designed with Ambient AI. Create your own personalized designs for free!
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Render */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/3 mb-6">
              {design.generated_render_url ? (
                design.room_image_url ? (
                  <BeforeAfterSlider before={design.room_image_url} after={design.generated_render_url} />
                ) : (
                  <img src={design.generated_render_url} alt="Generated room" className="w-full h-auto block" />
                )
              ) : (
                <div className="h-80 flex items-center justify-center text-white/25">No render available</div>
              )}
            </div>

            {design.generation_prompt && (
              <div className="p-6 rounded-2xl bg-white/3 border border-white/8">
                <h3 className="text-sm font-semibold mb-2 text-white/70">Generation Details</h3>
                <p className="text-xs text-white/40 leading-relaxed">{design.generation_prompt}</p>
              </div>
            )}
          </div>

          {/* Furniture List */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Shop This Look
              </h2>

              {items.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white/3 border border-white/8 text-center">
                  <p className="text-white/40 text-sm">No furniture items detected yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => {
                    const selectedMatch = item.selected_match_index != null && item.matches?.[item.selected_match_index];
                    const topMatches = item.matches?.slice(0, 3) || [];

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-2xl bg-white/3 border border-white/8 hover:border-white/15 transition-all"
                      >
                        <h3 className="font-semibold mb-1">{item.label}</h3>
                        <p className="text-xs text-white/40 mb-4">{item.style_tags?.join(" · ")}</p>

                        <div className="space-y-2">
                          {topMatches.map((match, idx) => {
                            const { label: btnLabel, className: btnClass } = getAffiliateButtonStyle(match.source);
                            return (
                              <a
                                key={idx}
                                href={match.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center justify-between p-3 rounded-xl transition-all ${btnClass}`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {match.image_url && (
                                    <img src={match.image_url} alt={match.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{match.title}</div>
                                    {match.price && (
                                      <div className="text-xs opacity-70 mt-0.5">€{match.price.toFixed(2)}</div>
                                    )}
                                  </div>
                                </div>
                                <ExternalLink className="w-4 h-4 flex-shrink-0 ml-2" />
                              </a>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 p-4 rounded-2xl bg-white/3 border border-white/8 text-center">
                <p className="text-xs text-white/40 mb-3">
                  Diese Seite enthält Affiliate-Links. Beim Kauf über diese Links erhalten wir eine Provision.
                </p>
                <Link
                  to={createPageUrl("Studio")}
                  className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Design Your Own Room
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}