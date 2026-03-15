import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Sparkles, Loader2, Recycle, Trash2, Download, Pencil, ShoppingBag, Clock, Heart, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import ProjectFilters from "@/components/projects/ProjectFilters";

const STATUS_CONFIG = {
  draft:      { label: "Draft",      color: "text-white/40 bg-white/5 border-white/10"                 },
  generating: { label: "Generating", color: "text-violet-400 bg-violet-500/10 border-violet-500/20"    },
  ready:      { label: "Ready",      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  shopping:   { label: "Shopping",   color: "text-amber-400 bg-amber-500/10 border-amber-500/20"       },
};

function DesignCard({ design, onDelete, deleting, user, savedDesigns, onToggleSave, onShare }) {
  const status = STATUS_CONFIG[design.status] || STATUS_CONFIG.draft;
  const [downloading, setDownloading] = useState(false);
  const isSaved = savedDesigns?.some((s) => s.design_id === design.id);

  const handleDownload = async () => {
    if (!design.generated_render_url) return;
    setDownloading(true);
    try {
      const res = await fetch(design.generated_render_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${design.name.replace(/\s+/g, "-").toLowerCase()}-render.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white/3 border border-white/8 rounded-3xl overflow-hidden hover:border-white/15 transition-all duration-300"
    >
      <div className="relative w-full aspect-video bg-white/5 overflow-hidden">
        {design.generated_render_url ? (
          <img src={design.generated_render_url} alt={design.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : design.room_image_url ? (
          <img src={design.room_image_url} alt={design.name} className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/15">
            <Sparkles className="w-8 h-8" />
          </div>
        )}

        {design.status === "generating" && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            <p className="text-xs text-violet-300 font-medium">Generating…</p>
          </div>
        )}

        {design.status !== "generating" && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Link
              to={createPageUrl(`Design`) + `?id=${design.id}`}
              className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-2 rounded-xl text-xs hover:bg-white/90 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Shop
            </Link>
            <Link
              to={createPageUrl("Studio")}
              className="flex items-center gap-1.5 bg-white/15 border border-white/20 text-white font-medium px-4 py-2 rounded-xl text-xs hover:bg-white/25 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Redesign
            </Link>
          </div>
        )}

        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium backdrop-blur-sm ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {user && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSave(design.id); }}
              className={`w-8 h-8 rounded-xl backdrop-blur-sm border flex items-center justify-center transition-all ${
                isSaved
                  ? "bg-pink-500/30 border-pink-500/50 text-pink-300"
                  : "bg-black/50 border-white/10 text-white/60 hover:text-white hover:bg-black/70"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
            </button>
          )}
          {isSaved && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(design.id); }}
              className="w-8 h-8 rounded-xl bg-violet-500/30 backdrop-blur-sm border border-violet-500/50 flex items-center justify-center text-violet-300 hover:bg-violet-500/40 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
          {design.generated_render_url && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              disabled={downloading}
              className="w-8 h-8 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm text-white truncate">{design.name}</h3>
          <button
            onClick={() => onDelete(design.id)}
            disabled={deleting}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {design.style && (
            <span className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
              {design.style}
            </span>
          )}
          {design.sustainability_mode && (
            <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Recycle className="w-2.5 h-2.5" /> Pre-loved
            </span>
          )}
          {design.budget_max && (
            <span className="text-xs bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded-full">
              €{design.budget_min?.toLocaleString()}–€{design.budget_max?.toLocaleString()}
            </span>
          )}
        </div>

        {design.generation_prompt && (
          <p className="text-white/30 text-xs leading-relaxed line-clamp-2 mb-3">{design.generation_prompt}</p>
        )}

        <div className="flex items-center gap-1 text-white/25 text-xs">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(design.created_date), { addSuffix: true })}
        </div>
      </div>
    </motion.div>
  );
}

export default function Projects() {
  const [designs,       setDesigns]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [deleting,      setDeleting]      = useState(null);
  const [user,          setUser]          = useState(null);
  const [savedDesigns,  setSavedDesigns]  = useState([]);
  const [shareLink,     setShareLink]     = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [filters,       setFilters]       = useState({ styles: [], roomTypes: [], budgetRange: null });

  const load = useCallback(async () => {
    const data = await base44.entities.RoomDesign.list("-created_date", 50);
    setDesigns(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    base44.auth.me().then(async (currentUser) => {
      setUser(currentUser);
      const saved = await base44.entities.SavedDesign.filter({ user_email: currentUser.email });
      setSavedDesigns(saved);
    }).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const hasGenerating = designs.some((d) => d.status === "generating");
    if (!hasGenerating) return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [designs, load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this design? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await base44.entities.RoomDesign.delete(id);
      setDesigns((prev) => prev.filter((d) => d.id !== id));
    } catch {
      alert("Couldn't delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleSave = async (designId) => {
    if (!user) return;
    const existing = savedDesigns.find((s) => s.design_id === designId);
    if (existing) {
      await base44.entities.SavedDesign.delete(existing.id);
      setSavedDesigns((prev) => prev.filter((s) => s.id !== existing.id));
    } else {
      const created = await base44.entities.SavedDesign.create({ design_id: designId, user_email: user.email });
      setSavedDesigns((prev) => [...prev, created]);
    }
  };

  const handleShare = async (designId) => {
    const saved = savedDesigns.find((s) => s.design_id === designId);
    if (!saved) return;
    
    let token = saved.share_token;
    if (!token) {
      token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await base44.entities.SavedDesign.update(saved.id, { share_token: token, is_public: true });
      setSavedDesigns((prev) => prev.map((s) => s.id === saved.id ? { ...s, share_token: token, is_public: true } : s));
    } else if (!saved.is_public) {
      await base44.entities.SavedDesign.update(saved.id, { is_public: true });
      setSavedDesigns((prev) => prev.map((s) => s.id === saved.id ? { ...s, is_public: true } : s));
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

  const filteredDesigns = designs.filter((design) => {
    // Style filter
    if (filters.styles?.length > 0 && !filters.styles.includes(design.style)) {
      return false;
    }
    
    // Room type filter
    if (filters.roomTypes?.length > 0 && !filters.roomTypes.includes(design.room_type)) {
      return false;
    }
    
    // Budget range filter
    if (filters.budgetRange) {
      const designMax = design.budget_max || 0;
      if (designMax < filters.budgetRange.min || designMax > filters.budgetRange.max) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Projects</h1>
            <p className="text-white/35 text-sm mt-1">{designs.length} room design{designs.length !== 1 ? "s" : ""}</p>
          </div>
          <Link
            to={createPageUrl("Studio")}
            className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-semibold px-5 py-3 rounded-2xl transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> New design
          </Link>
        </div>

        {designs.length > 0 && (
          <ProjectFilters
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={designs.length}
            filteredCount={filteredDesigns.length}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/40 mb-6">No designs yet. Create your first one.</p>
            <Link
              to={createPageUrl("Studio")}
              className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-semibold px-6 py-3 rounded-2xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Start designing
            </Link>
          </div>
        ) : filteredDesigns.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/40 mb-4">No designs match your filters.</p>
            <button
              onClick={() => setFilters({ styles: [], roomTypes: [], budgetRange: null })}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDesigns.map((design) => (
              <DesignCard
                key={design.id}
                design={design}
                onDelete={handleDelete}
                deleting={deleting === design.id}
                user={user}
                savedDesigns={savedDesigns}
                onToggleSave={handleToggleSave}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </div>

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
                Anyone with this link can view your room design — no login required.
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
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-6 py-3 rounded-2xl font-medium transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}