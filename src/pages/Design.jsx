import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, ShoppingBag, Sparkles, ArrowLeft, Recycle, Lock, ShoppingCart, Heart, Share2, Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FurnitureMatchCard from "@/components/design/FurnitureMatchCard";
import CartDrawer from "@/components/design/CartDrawer";

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

export default function Design() {
  const params   = new URLSearchParams(window.location.search);
  const designId = params.get("id");

  const [design,          setDesign]          = useState(null);
  const [items,           setItems]           = useState([]);
  const [selectedItem,    setSelectedItem]    = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [detecting,       setDetecting]       = useState(false);
  const [user,            setUser]            = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [cartOpen,        setCartOpen]        = useState(false);
  const [isSaved,         setIsSaved]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [savedDesign,     setSavedDesign]     = useState(null);
  const [showShareModal,  setShowShareModal]  = useState(false);
  const [shareLink,       setShareLink]       = useState("");
  const [copied,          setCopied]          = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user || !designId) return;
    base44.entities.SavedDesign.filter({ design_id: designId, user_email: user.email })
      .then((saved) => {
        setIsSaved(saved.length > 0);
        if (saved.length > 0) setSavedDesign(saved[0]);
      })
      .catch(() => {});
  }, [user, designId]);

  const toggleSave = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setSaving(true);
    try {
      if (isSaved) {
        const saved = await base44.entities.SavedDesign.filter({ design_id: designId, user_email: user.email });
        if (saved.length > 0) await base44.entities.SavedDesign.delete(saved[0].id);
        setIsSaved(false);
        setSavedDesign(null);
      } else {
        const created = await base44.entities.SavedDesign.create({ design_id: designId, user_email: user.email });
        setIsSaved(true);
        setSavedDesign(created);
      }
    } catch (err) {
      console.error('Save toggle failed:', err);
    }
    setSaving(false);
  };

  const handleShare = async () => {
    if (!savedDesign) return;
    
    let token = savedDesign.share_token;
    if (!token) {
      token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await base44.entities.SavedDesign.update(savedDesign.id, { share_token: token, is_public: true });
      setSavedDesign({ ...savedDesign, share_token: token, is_public: true });
    } else if (!savedDesign.is_public) {
      await base44.entities.SavedDesign.update(savedDesign.id, { is_public: true });
      setSavedDesign({ ...savedDesign, is_public: true });
    }
    
    const link = `${window.location.origin}/SharedDesign?token=${token}`;
    setShareLink(link);
    setShowShareModal(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadDesign = useCallback(async () => {
    if (!designId) return;
    const d = await base44.entities.RoomDesign.filter({ id: designId });
    if (d.length) setDesign(d[0]);
    const existing = await base44.entities.FurnitureItem.filter({ design_id: designId });
    setItems(existing);
    setLoading(false);
  }, [designId]);

  useEffect(() => { loadDesign(); }, [loadDesign]);

  useEffect(() => {
    if (!design || design.status !== "generating") return;
    const timer = setInterval(async () => {
      const d = await base44.entities.RoomDesign.filter({ id: designId });
      if (d.length) {
        setDesign(d[0]);
        if (d[0].status !== "generating") clearInterval(timer);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [design?.status, designId]);

  const detectItems = async () => {
    if (!design) return;

    // Check if user has Pro plan
    if (user) {
      const userCredits = await base44.entities.UserCredits.filter({ user_email: user.email });
      if (userCredits.length > 0 && userCredits[0].plan_type !== 'pro') {
        setShowLoginPrompt(false);
        alert('AI product matching is a Pro feature. Upgrade to Pro to unlock this feature.');
        return;
      }
    }

    setDetecting(true);

    const tier = design.budget_tier || "mid";
    const tierKeywords = {
      budget:  { hint: "günstig preiswert unter 50 Euro" },
      mid:     { hint: "gutes Preis-Leistungs-Verhältnis Qualität" },
      premium: { hint: "Premium Design hochwertig" },
      luxury:  { hint: "Luxus exklusiv Designer High-End" },
    };
    const { hint: budgetHint } = tierKeywords[tier];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an Amazon.de product search expert analyzing an AI-generated interior design render in the ${design.style} style.
Budget: €${design.budget_min ?? 0}–€${design.budget_max ?? 5000} (tier: ${tier}).
TASK: Identify 8-12 distinct furniture or decor items visible in this room render. For each item provide:
- label: descriptive name in English (e.g. "Low Linen Sofa", "Rattan Pendant Light")
- style_tags: 2-3 English style tags (e.g. ["minimalist", "natural wood", "japandi"])
- position_x, position_y: percentage position on the image (0-100) where the item appears
- search_query: a precise GERMAN Amazon.de search query (4-6 words) that will return real buyable products. Be specific about material, style and colour.
CRITICAL: The budget tier is "${tier}" — your query MUST include these German keywords: "${budgetHint}".
Examples for this tier: ${
  tier === "budget"  ? '"Teppich Wohnzimmer günstig", "Stehlampe günstig preiswert"' :
  tier === "mid"     ? '"Stehlampe Wohnzimmer modern Qualität", "Sofa Stoff grau Bestseller"' :
  tier === "premium" ? '"Designer Stehlampe Premium schwarz", "Sofa hochwertig Leder modern"' :
                       '"Luxus Sofa Leder Designer exklusiv", "Stehlampe High-End exklusiv"'}.
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
                label:        { type: "string" },
                style_tags:   { type: "array", items: { type: "string" } },
                position_x:   { type: "number" },
                position_y:   { type: "number" },
                search_query: { type: "string" },
              },
            },
          },
        },
      },
    });

    const itemsWithMatches = await Promise.all(
      (result.items || []).map(async (item) => {
        let matches = [];
        try {
          const res = await base44.functions.invoke("getAmazonProducts", {
            query:       item.search_query || item.label,
            limit:       3,
            budget_tier: tier,
            budget_max:  design.budget_max,
          });
          matches = res.data?.matches || [];
        } catch (_) {}

        if (matches.length === 0) {
          const query = encodeURIComponent(item.search_query || item.label);
          matches = [
            { title: item.label, price: null, image_url: null, source: "Amazon", url: `https://www.amazon.de/s?k=${query}&tag=ambient019-21&linkCode=ur2`, is_preloved: false, similarity_score: 0.5 },
            { title: item.label, price: null, image_url: null, source: "IKEA",   url: `https://www.ikea.com/de/de/search/?q=${query}`, is_preloved: false, similarity_score: 0.4 },
          ];
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
            <p className="text-white/35 text-xs">
              {design.style} · €{design.budget_min?.toLocaleString()}–€{design.budget_max?.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {design.sustainability_mode && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs text-emerald-400">
              <Recycle className="w-3 h-3" /> Pre-Loved mode
            </div>
          )}
          <button
            onClick={toggleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isSaved
                ? "bg-pink-500/20 border border-pink-500/40 text-pink-300"
                : "bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </button>
          {isSaved && (
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-violet-300 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          )}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-violet-300 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Cart
            {items.filter((i) => i.selected_match_index != null).length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {items.filter((i) => i.selected_match_index != null).length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Render + hotspots */}
        <div className="lg:col-span-3">
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/3">
            {design.status === "generating" ? (
              <div className="h-80 flex flex-col items-center justify-center gap-4 text-white/40">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <p className="text-sm">Your design is being generated…</p>
                <p className="text-xs text-white/25">This usually takes 30–60 seconds</p>
              </div>
            ) : design.generated_render_url ? (
              <div className="relative w-full">
                {design.room_image_url ? (
                  <BeforeAfterSlider before={design.room_image_url} after={design.generated_render_url} />
                ) : (
                  <img src={design.generated_render_url} alt="Generated room" className="w-full h-auto block" />
                )}
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
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-white/25">No render yet</div>
            )}
          </div>

          {design.generated_render_url && items.length === 0 && design.status !== "generating" && (
            <>
              <button
                onClick={() => { if (!user) { setShowLoginPrompt(true); } else { detectItems(); } }}
                disabled={detecting}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {detecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Detecting furniture…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Detect &amp; match furniture to shop</>
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
                      <p className="text-sm font-medium text-white">Pro feature: AI product matching</p>
                      <p className="text-xs text-white/40 mt-1">Upgrade to Pro plan to automatically detect and match furniture from your renders.</p>
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
              <motion.div key={selectedItem.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <FurnitureMatchCard
                  item={selectedItem}
                  onItemUpdate={(updated) => {
                    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
                    setSelectedItem(updated);
                  }}
                  onCartOpen={() => setCartOpen(true)}
                />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center gap-4 text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-white/30 text-sm max-w-xs">
                  {items.length > 0 ? "Tap a pin on the render or a chip below to browse matches." : "Click 'Detect & match furniture' to start shopping."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={items}
        onRemove={async (itemId) => {
          await base44.entities.FurnitureItem.update(itemId, { selected_match_index: null });
          setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, selected_match_index: null } : i)));
          if (selectedItem?.id === itemId) setSelectedItem((s) => ({ ...s, selected_match_index: null }));
        }}
      />

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl p-8 shadow-2xl"
              style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-violet-500 to-pink-500">
                <Share2 className="w-7 h-7 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2 text-center">Share Your Design</h2>
              <p className="text-white/40 text-sm text-center mb-6">
                Anyone with this link can view your room design and furniture list — no login required.
              </p>

              <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-transparent text-white/70 text-sm outline-none"
                  />
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 bg-violet-500 hover:bg-violet-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-6 py-3 rounded-2xl font-medium transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: design.name, url: shareLink });
                    } else {
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my ${design.style} room design!`)}&url=${encodeURIComponent(shareLink)}`, '_blank');
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90 text-white px-6 py-3 rounded-2xl font-semibold transition-opacity"
                >
                  Share on Social
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}