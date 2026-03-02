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
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a visual product search engine analyzing an AI-generated interior design render in the ${design.style} style.

TASK: Identify 8-12 distinct furniture or decor items visible in this room render. For each item, provide 3 real product matches available in Germany.

For each item provide:
- label: descriptive name (e.g. "Niedriges Leinensofa", "Rattan-Hängeleuchte")
- style_tags: 2-3 English tags (e.g. ["minimalist", "natural wood", "japandi"])
- position_x, position_y: percentage position on the image (0-100) where the item appears
- matches: EXACTLY 3 products. For EACH match you MUST provide:
  * title: specific product name (include material, color, size if known)
  * price: realistic price IN EUROS within €${design.budget_min}–€${design.budget_max}
  * source: one of "Amazon", "IKEA", "eBay"${design.sustainability_mode ? ', prefer "eBay" for pre-loved items' : ""}
  * image_url: a direct product image URL (e.g. from amazon.de or ikea.com CDN). Leave empty if unsure.
  * url: use ONLY search URLs — never guessed product IDs. Amazon: https://www.amazon.de/s?k=[german+search+terms], IKEA: https://www.ikea.com/de/de/search/?q=[search+terms], eBay: https://www.ebay.de/sch/i.html?_nkw=[search+terms]
  * is_preloved: true only for eBay second-hand items
  * similarity_score: 0.0-1.0 visual similarity confidence

${design.sustainability_mode ? "IMPORTANT: Prioritise pre-loved/second-hand eBay options where possible." : ""}

CRITICAL: Always use search URLs. Never guess ASINs or article numbers — they cause 404 errors.`,
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
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                    title: { type: "string" },
                    price: { type: "number" },
                    source: { type: "string" },
                    image_url: { type: "string" },
                    url: { type: "string" },
                    is_preloved: { type: "boolean" },
                    similarity_score: { type: "number" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const created = await Promise.all(
      (result.items || []).map((item) =>
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
            <button
              onClick={detectItems}
              disabled={detecting}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {detecting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Detecting furniture…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Detect & match furniture to shop</>
              )}
            </button>
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