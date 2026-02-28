import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Sparkles, Loader2, Recycle, Trash2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_LABEL = {
  draft: { label: "Draft", color: "text-white/30 bg-white/5 border-white/10" },
  generating: { label: "Generating", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  ready: { label: "Ready", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  shopping: { label: "Shopping", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

export default function Projects() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    load();
  }, []);

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
      <div className="max-w-4xl mx-auto">
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
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-24">
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
          <div className="grid gap-4">
            {designs.map((design, i) => {
              const status = STATUS_LABEL[design.status] || STATUS_LABEL.draft;
              return (
                <motion.div
                  key={design.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex items-center gap-4 bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                    {design.generated_render_url ? (
                      <img src={design.generated_render_url} alt="" className="w-full h-full object-cover" />
                    ) : design.room_image_url ? (
                      <img src={design.room_image_url} alt="" className="w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/15 text-xs">No image</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{design.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                      {design.sustainability_mode && <Recycle className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <p className="text-white/35 text-xs">{design.style || "No style"} · £{design.budget_min?.toLocaleString()}–£{design.budget_max?.toLocaleString()}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(design.id)}
                      disabled={deleting === design.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      {deleting === design.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    <Link
                      to={createPageUrl(`Design?id=${design.id}`)}
                      className="flex items-center gap-1 bg-white/8 hover:bg-white/12 text-white/70 text-xs px-4 py-2 rounded-xl transition-colors font-medium"
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}