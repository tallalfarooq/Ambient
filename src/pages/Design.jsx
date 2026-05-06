import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/api/apiClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, ShoppingBag, Sparkles, ArrowLeft, Recycle, Lock, ShoppingCart, Heart, Share2, Check, Copy, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FurnitureMatchCard from "@/components/design/FurnitureMatchCard";
import CartDrawer from "@/components/design/CartDrawer";
import { AMAZON_TAG } from "@/components/affiliateLinks";

function ImageWatermark() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      style={{ zIndex: 10 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 9999,
          background: "rgba(10,10,11,0.70)",
          border: "1px solid rgba(27,143,160,0.50)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
          userSelect: "none",
        }}
      >
        <span style={{ color: "#1B8FA0", fontSize: 15, lineHeight: 1 }}>✦</span>
        <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
          Designed by Ambient Space
        </span>
      </div>
    </div>
  );
}

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
      <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm text-white pointer-events-none" style={{ background: "rgba(27,143,160,0.8)" }}>After ✦</span>
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
  const [showComparison,  setShowComparison]  = useState(false);
  const [isPaidUser,      setIsPaidUser]      = useState(false);
  const [budgetMax,       setBudgetMax]       = useState(2000); // $ budget filter — applied when shopping

  useEffect(() => {
    apiClient.auth.me().then(async (u) => {
      setUser(u);
      try {
        const uc = await apiClient.entities.UserCredits.filter({ user_email: u.email });
        if (uc.length > 0 && uc[0].plan_type !== "free") setIsPaidUser(true);
      } catch {}
    }).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user || !designId) return;
    apiClient.entities.SavedDesign.filter({ design_id: designId, user_email: user.email })
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
        const saved = await apiClient.entities.SavedDesign.filter({ design_id: designId, user_email: user.email });
        if (saved.length > 0) await apiClient.entities.SavedDesign.delete(saved[0].id);
        setIsSaved(false);
        setSavedDesign(null);
      } else {
        const created = await apiClient.entities.SavedDesign.create({ design_id: designId, user_email: user.email });
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
      token = crypto.randomUUID().replace(/-/g, "");
      await apiClient.entities.SavedDesign.update(savedDesign.id, { share_token: token, is_public: true });
      setSavedDesign({ ...savedDesign, share_token: token, is_public: true });
    } else if (!savedDesign.is_public) {
      await apiClient.entities.SavedDesign.update(savedDesign.id, { is_public: true });
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
    try {
      const d = await apiClient.entities.RoomDesign.filter({ id: designId });
      if (d.length) setDesign(d[0]);
      const existing = await apiClient.entities.FurnitureItem.filter({ design_id: designId });
      setItems(existing);
    } catch (err) {
      console.error("Failed to load design:", err);
    } finally {
      setLoading(false);
    }
  }, [designId]);

  useEffect(() => { loadDesign(); }, [loadDesign]);

  useEffect(() => {
    if (!design || design.status !== "generating") return;
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // ~2 minutes at 3 s intervals
    const timer = setInterval(async () => {
      attempts++;
      try {
        const d = await apiClient.entities.RoomDesign.filter({ id: designId });
        if (d.length) {
          setDesign(d[0]);
          if (d[0].status !== "generating") clearInterval(timer);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
        setDesign((prev) => prev ? { ...prev, status: "error" } : prev);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [design?.status, designId]);

  const detectItems = async () => {
    if (!design) return;

    setDetecting(true);

    // Derive a quality hint from the user's live budget slider
    const budgetHint =
      budgetMax <= 500  ? "budget-friendly affordable" :
      budgetMax <= 1500 ? "good value quality" :
      budgetMax <= 4000 ? "premium high-end design" :
                          "luxury exclusive designer";

    const result = await apiClient.integrations.Core.InvokeLLM({
      prompt: `You are an Amazon product search expert analyzing an AI-generated interior design render in the ${design.style} style.
Budget: up to $${budgetMax} per item.

TASK: Identify 8-12 distinct furniture or decor items clearly visible in this room render.

For each item provide:
- label: descriptive English name including COLOR + MATERIAL + TYPE (e.g. "Beige Linen Low-Profile Sofa", "Walnut Wood Coffee Table", "Rattan Pendant Light")
- style_tags: 2-3 English style tags (e.g. ["japandi", "natural oak", "minimalist"])
- bbox_left: left edge of the item as % of image width (0=left edge, 100=right edge)
- bbox_right: right edge of the item as % of image width
- bbox_top: top edge of the item as % of image height (0=top, 100=bottom)
- bbox_bottom: bottom edge of the item as % of image height
  Example: a sofa that fills the bottom-center of the image → bbox_left:15, bbox_right:70, bbox_top:60, bbox_bottom:90
  Example: a pendant light in the upper-right quarter → bbox_left:60, bbox_right:80, bbox_top:5, bbox_bottom:25
- search_query: precise English Amazon search query (5-7 words): COLOR + MATERIAL + STYLE + PRODUCT TYPE.
  Examples: "beige linen low-profile sofa Japandi", "walnut mid-century coffee table tapered legs", "rattan pendant light boho natural"

Budget guidance — queries MUST reflect: "${budgetHint}".
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
                bbox_left:    { type: "number" },
                bbox_right:   { type: "number" },
                bbox_top:     { type: "number" },
                bbox_bottom:  { type: "number" },
                search_query: { type: "string" },
              },
            },
          },
        },
      },
    });

    // Compute pin center from bounding box — much more accurate than a single point estimate
    const withPositions = (result.items || []).map((item) => ({
      ...item,
      position_x: Math.round(((item.bbox_left ?? 10) + (item.bbox_right ?? 90)) / 2 * 10) / 10,
      position_y: Math.round(((item.bbox_top  ?? 10) + (item.bbox_bottom ?? 90)) / 2 * 10) / 10,
    }));

    const itemsWithMatches = await Promise.all(
      withPositions.map(async (item) => {
        let matches = [];
        try {
          const res = await apiClient.functions.invoke("getAmazonProducts", {
            query:      item.search_query || item.label,
            limit:      3,
            budget_max: budgetMax,
          });
          matches = res.data?.matches || [];
        } catch (_) {}

        if (matches.length === 0) {
          const query = encodeURIComponent(item.search_query || item.label);
          matches = [
            { title: item.label, price: null, image_url: null, source: "Amazon", url: `https://www.amazon.com/s?k=${query}&tag=${AMAZON_TAG}&linkCode=ur2&low-price=1&high-price=${budgetMax}`, is_preloved: false, similarity_score: 0.5 },
            { title: item.label, price: null, image_url: null, source: "IKEA",   url: `https://www.ikea.com/us/en/search/?q=${query}`, is_preloved: false, similarity_score: 0.4 },
          ];
        }
        return { ...item, matches };
      })
    );

    const created = await Promise.all(
      itemsWithMatches.map((item) =>
        apiClient.entities.FurnitureItem.create({ ...item, design_id: designId })
      )
    );
    setItems(created);
    setDetecting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1B8FA0" }} />
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
            <p className="text-white/35 text-xs">{design.style}</p>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(27,143,160,0.15)", border: "1px solid rgba(27,143,160,0.35)", color: "#1B8FA0" }}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          )}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(27,143,160,0.15)", border: "1px solid rgba(27,143,160,0.35)", color: "#1B8FA0" }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Cart
            {items.filter((i) => i.selected_match_index != null).length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center" style={{ background: "#1B8FA0" }}>
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
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1B8FA0" }} />
                <p className="text-sm">Your design is being generated…</p>
                <p className="text-xs text-white/25">This usually takes 30–60 seconds</p>
              </div>
            ) : design.generated_render_url ? (
              <div
                className="relative w-full"
                onContextMenu={!isPaidUser ? (e) => e.preventDefault() : undefined}
              >
                {/* Show generated image by default; comparison is opt-in */}
                {showComparison && design.room_image_url ? (
                  <BeforeAfterSlider before={design.room_image_url} after={design.generated_render_url} />
                ) : (
                  <img
                    src={design.generated_render_url}
                    alt="Generated room"
                    className="w-full h-auto block"
                    draggable={false}
                    onContextMenu={!isPaidUser ? (e) => e.preventDefault() : undefined}
                    style={!isPaidUser ? { pointerEvents: "none", userSelect: "none" } : {}}
                  />
                )}

                {/* Transparent full-coverage shield — catches any right-click that
                    slips through on free tier (e.g. on the slider or pin buttons) */}
                {!isPaidUser && (
                  <div
                    className="absolute inset-0"
                    style={{ zIndex: 9, background: "transparent" }}
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                  />
                )}

                {!isPaidUser && <ImageWatermark />}

                {/* Compare toggle button */}
                {design.room_image_url && (
                  <button
                    onClick={() => setShowComparison((v) => !v)}
                    className="absolute top-3 left-3 text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm transition-all"
                    style={{
                      background: showComparison ? "rgba(27,143,160,0.85)" : "rgba(0,0,0,0.55)",
                      color: "white",
                    }}
                  >
                    {showComparison ? "Hide original" : "Compare ⇄"}
                  </button>
                )}

                {/* Product pins — numbered for clarity */}
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="absolute w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center text-white text-[10px] font-bold hover:scale-110"
                    style={{
                      left: `${item.position_x}%`,
                      top: `${item.position_y}%`,
                      transform: `translate(-50%, -50%) scale(${selectedItem?.id === item.id ? 1.25 : 1})`,
                      background: selectedItem?.id === item.id ? "#1B8FA0" : "rgba(0,0,0,0.72)",
                      borderColor: selectedItem?.id === item.id ? "white" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-white/25">No render yet</div>
            )}
          </div>

          {design.generated_render_url && items.length === 0 && design.status !== "generating" && (
            <>
              {/* ── Budget slider ───────────────────────────────── */}
              <div className="mt-4 rounded-2xl p-4 border border-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-white/50">Shopping budget per item</p>
                  <span className="text-sm font-bold" style={{ color: "#1B8FA0" }}>
                    up to ${budgetMax.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={100}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "#1B8FA0" }}
                />
                <div className="flex justify-between mt-1.5 text-[10px] text-white/25">
                  <span>$100</span>
                  <span>$2,500</span>
                  <span>$5,000</span>
                  <span>$10,000</span>
                </div>
              </div>

              <button
                onClick={() => { if (!user) { setShowLoginPrompt(true); } else { detectItems(); } }}
                disabled={detecting}
                className="mt-3 w-full flex items-center justify-center gap-2 text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
              >
                {detecting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Detecting furniture…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Detect &amp; match furniture to shop</>
                )}
              </button>

              {/* Global search with Google Lens — paid users only */}
              {isPaidUser ? (
                <button
                  onClick={() => window.open(`https://www.google.com/searchbyimage?image_url=${encodeURIComponent(design.generated_render_url)}`, '_blank', 'noopener,noreferrer')}
                  className="mt-2 w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-2xl hover:opacity-90 transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                >
                  <Globe className="w-4 h-4" />
                  Search globally with Google
                </button>
              ) : (
                <div
                  className="mt-2 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl cursor-not-allowed"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}
                  title="Upgrade to Basic or Pro to search globally"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-sm">Search globally with Google Lens</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(201,150,58,0.15)", color: "#C9963A", border: "1px solid rgba(201,150,58,0.3)" }}>PRO</span>
                </div>
              )}

              <AnimatePresence>
                {showLoginPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-3 p-5 rounded-2xl flex flex-col items-center gap-3 text-center"
                    style={{ border: "1px solid rgba(27,143,160,0.3)", background: "rgba(27,143,160,0.08)" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(27,143,160,0.15)" }}>
                      <Lock className="w-5 h-5" style={{ color: "#1B8FA0" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Sign in to detect furniture</p>
                      <p className="text-xs text-white/40 mt-1">Create a free account to use AI product matching. Uses credits from your account.</p>
                    </div>
                    <button
                      onClick={() => apiClient.auth.redirectToLogin(window.location.href)}
                      className="text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-opacity hover:opacity-90"
                      style={{ background: "#1B8FA0" }}
                    >
                      Sign in — it's free
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {items.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {items.map((item, idx) => (
                <div key={item.id} className={`rounded-2xl border text-xs transition-all overflow-hidden ${
                    selectedItem?.id === item.id ? "border-white/30 bg-white/5" : "border-white/8 bg-white/3"
                  }`}>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="text-left p-3 w-full hover:bg-white/3 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                        style={{ background: selectedItem?.id === item.id ? "#1B8FA0" : "rgba(255,255,255,0.15)" }}>
                        {idx + 1}
                      </span>
                      <span className="font-medium text-white/80 truncate">{item.label}</span>
                    </div>
                    <div className="text-white/30 truncate pl-5">{item.style_tags?.join(", ")}</div>
                  </button>
                  {/* Google Lens search for this specific item — paid only */}
                  {isPaidUser && (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${item.label || ""} ${item.style_tags?.slice(0,2).join(" ") || ""}`.trim())}`, '_blank', 'noopener,noreferrer'); }}
                      className="w-full flex items-center gap-1 px-3 py-1.5 border-t border-white/5 text-[10px] text-white/35 hover:text-white/60 hover:bg-white/3 transition-all active:opacity-60"
                    >
                      <Globe className="w-2.5 h-2.5 flex-shrink-0" /> Search globally
                    </button>
                  )}
                </div>
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
          await apiClient.entities.FurnitureItem.update(itemId, { selected_match_index: null });
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
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}>
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
                    className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ background: "#1B8FA0" }}
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
                  className="flex-1 text-white px-6 py-3 rounded-2xl font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
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