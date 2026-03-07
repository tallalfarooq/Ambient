import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Sparkles, Loader2, Recycle, Trash2, Download, Pencil, ShoppingBag, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG = {
  draft:      { label: "Draft",      color: "text-white/40 bg-white/5 border-white/10" },
  generating: { label: "Generating", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  ready:      { label: "Ready",      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  shopping:   { label: "Shopping",   color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

function DesignCard({ design, onDelete, deleting }) {
  const status = STATUS_CONFIG[design.status] || STATUS_CONFIG.draft;
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!design.generated_render_url) return;
    setDownloading(true);
    const res = await fetch(design.generated_render_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${design.name.replace(/\s+/g, "-").toLowerCase()}-render.jpg`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white/3 border border-white/8 rounded-3xl overflow-hidden hover:border-white/15 transition-all duration-300"
    >
      {/* Thumbnail */}
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

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Link
            to={createPageUrl(`Design?id=${design.id}`)}
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

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium backdrop-blur-sm ${status.color}`}>
            {status.label}
          </span>
        </div>

        {/* Download button */}
        {design.generated_render_url && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Info */}
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

        {/* Tags */}
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
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.RoomDesign.list("-created_date", 50);
    setDesigns(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await base44.entities.RoomDesign.delete(id);
    setDesigns((prev) => prev.filter((d) => d.id !== id));
    setDeleting(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {designs.map((design, i) => (
              <DesignCard
                key={design.id}
                design={design}
                onDelete={handleDelete}
                deleting={deleting === design.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}