import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, ShoppingBag, Sparkles, ArrowLeft, Recycle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FurnitureMatchCard from "@/components/design/FurnitureMatchCard";

export default function Design() {
  const params = new URLSearchParams(window.location.search);
  const designId = params.get("id");

  const [design, setDesign] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [user, setUser] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!designId) return;
    loadDesign();
  }, [designId]);

  const loadDesign = async () => {
    setLoading(true);
    const d = await base44.entities.RoomDesign.filter({ id: designId });
    if (d.length) setDesign(d[0]);
    const existing = await base44.entities.FurnitureItem.filter({ design_id: designId });
    setItems(existing);
    setLoading(false);
  };

  const detectItems = async () => {
    if (!design) return;
    setDetecting(true);
    // Step 1: Ask the LLM to identify items + generate search queries
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an Amazon.de product search expert analyzing an AI-generated interior design render in the ${design.style} style.
Budget: €${design.budget_min ?? 0}–€${design.budget_max ?? 5000}.

TASK: Identify 8-12 distinct furniture or decor items visible in this room render.

For each item provide:
- label: descriptive name in English (e.g. "Low Linen Sofa", "Rattan Pendant Light")
- style_tags: 2-3 English style tags (e.g. ["minimalist", "natural wood", "japandi"])
- position_x, position_y: percentage position on the image (0-100) where the item appears
- search_query: a precise GERMAN Amazon.de search query (4-6 words) that will return real buyable products. Be specific about material, style and colour. Examples: "Stehlampe Wohnzimmer schwarz modern", "3-Sitzer Sofa Stoff grau skandinavisch", "Couchtisch Holz rund hell". Match the budget tier: ${(design.budget_max ?? 1000) < 200 ? 'günstig preiswert' : (design.budget_max ?? 1000) < 800 ? 'mittelklasse' : 'premium hochwertig'}.

${design.sustainability_mode ? "IMPORTANT: Prioritise pre-loved/second-hand options where possible." : ""}`,
      file_urls: [design.generated_render_url].filter(Boolean),
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                style_tags: { type: "array", items: { type: "string" } },
                position_x: { type: "number" },
                position_y: { type: "number" },
                search_query: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Step 2: For each item, try local catalog first, fall back to Amazon search URL
    const itemsWithMatches = await Promise.all(
      (result.items || []).map(async (item) => {
        let matches = [];
        try {
          const res = await base44.functions.invoke('searchCatalog', {
            query: item.search_query || item.label,
            budget_max: design.budget_max,
            budget_min: design.budget_min,
            limit: 3
          });
          matches = res.data?.matches || [];
        } catch (_) {}

        // Fallback: generate search-based matches if catalog is empty or returns < 3
        if (matches.length < 3) {
          const query = encodeURIComponent(item.search_query || item.label);
          const fallbacks = [
            { title: `${item.label} – Amazon Search`, price: null, image_url: null, source: "Amazon", url: `https://www.amazon.com/s?k=${query}&tag=ambient019-21`, is_preloved: false, similarity_score: 0.5 },
            { title: `${item.label} – IKEA Search`, price: null, image_url: null, source: "IKEA", url: `https://www.ikea.com/de/de/search/?q=${query}`, is_preloved: false, similarity_score: 0.4 },
            { title: `${item.label} – eBay Search`, price: null, image_url: null, source: "eBay", url: `https://www.ebay.com/sch/i.html?_nkw=${query}`, is_preloved: design.sustainability_mode || false, similarity_score: 0.3 }
          ];
          matches = [...matches, ...fallbacks].slice(0, 3);
        }

        return { ...item, matches };
      })
    );

    const created = await Promise.all(
      itemsWithMatches.map((item) =>
        base44.entities.FurnitureItem.create({ ...item, design_id: designId })
      )
    );
    setItems(created);
    setDetecting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white/40">
        Design not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Projects")} className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold text-sm">{design.name}</h1>
            <p className="text-white/35 text-xs">{design.style} · €{design.budget_min?.toLocaleString()}–€{design.budget_max?.toLocaleString()}</p>
          </div>
        </div>
        {design.sustainability_mode && (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs text-emerald-400">
            <Recycle className="w-3 h-3" /> Pre-Loved mode
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Render + hotspots */}
        <div className="lg:col-span-3">
          <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/3">
            {design.generated_render_url ? (
              <>
                <img
                  src={design.generated_render_url}
                  alt="Generated room"
                  className="w-full object-cover"
                />
                {/* Hotspot markers */}
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{ left: `${item.position_x}%`, top: `${item.position_y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                      selectedItem?.id === item.id
                        ? "bg-violet-500 border-violet-300 scale-125"
                        : "bg-black/60 border-white/50 hover:scale-110 hover:border-violet-400"
                    }`}
                  >
                    <ShoppingBag className="w-3 h-3 text-white" />
                  </button>
                ))}
              </>
            ) : (
              <div className="h-80 flex items-center justify-center text-white/25">
                No render yet
              </div>
            )}
          </div>

          {/* Detect / Shop CTA */}
          {design.generated_render_url && items.length === 0 && (
            <>
              <button
                onClick={() => {
                  if (!user) {
                    setShowLoginPrompt(true);
                  } else {
                    detectItems();
                  }
                }}
                disabled={detecting}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {detecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Detecting furniture…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Detect & match furniture to shop</>
                )}
              </button>

              <AnimatePresence>
                {showLoginPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-3 p-5 rounded-2xl border border-violet-500/30 bg-violet-500/8 flex flex-col items-center gap-3 text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Sign in to unlock product matches</p>
                      <p className="text-xs text-white/40 mt-1">Create a free account to detect furniture and start shopping.</p>
                    </div>
                    <button
                      onClick={() => base44.auth.redirectToLogin(window.location.href)}
                      className="bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
                    >
                      Sign in / Register
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {items.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`text-left p-3 rounded-2xl border text-xs transition-all ${
                    selectedItem?.id === item.id
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-white/8 bg-white/3 hover:border-white/15"
                  }`}
                >
                  <div className="font-medium text-white/80 truncate">{item.label}</div>
                  <div className="text-white/30 mt-0.5 truncate">{item.style_tags?.join(", ")}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shopping panel */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div
                key={selectedItem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <FurnitureMatchCard item={selectedItem} onItemUpdate={(updated) => {
                  setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
                  setSelectedItem(updated);
                }} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center gap-4 text-center py-20"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/30 text-sm max-w-xs">
                  {items.length > 0
                    ? "Tap a pin on the render or a chip below to browse matches."
                    : "Click 'Detect & match furniture' to start shopping."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}