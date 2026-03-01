import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Sparkles, Trash2, ShoppingBag, ImageOff } from "lucide-react";

const STATUS_LABEL = {
  draft: { label: "Draft", color: "text-white/30 bg-white/5" },
  generating: { label: "Generating", color: "text-amber-400 bg-amber-400/10" },
  ready: { label: "Ready", color: "text-emerald-400 bg-emerald-400/10" },
  shopping: { label: "Shopping", color: "text-violet-400 bg-violet-400/10" },
};

export default function MyDesigns() {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    setLoading(true);
    const list = await base44.entities.RoomDesign.list("-created_date");
    setDesigns(list.filter((d) => d.generated_render_url));
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await base44.entities.RoomDesign.delete(id);
    setDesigns((prev) => prev.filter((d) => d.id !== id));
    setDeleting(null);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold">My Designs</h1>
            <p className="text-white/35 text-sm mt-1">Your saved AI-generated room designs</p>
          </div>
          <button
            onClick={() => navigate(createPageUrl("Studio"))}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold px-5 py-2.5 rounded-2xl hover:opacity-90 transition-opacity text-sm"
          >
            <Sparkles className="w-4 h-4" /> New Design
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : designs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-white/25">
            <ImageOff className="w-12 h-12" />
            <p className="text-lg">No saved designs yet</p>
            <button
              onClick={() => navigate(createPageUrl("Studio"))}
              className="text-violet-400 hover:text-violet-300 text-sm transition-colors"
            >
              Create your first design →
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {designs.map((design, i) => {
              const status = STATUS_LABEL[design.status] || STATUS_LABEL.ready;
              return (
                <motion.div
                  key={design.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/3 border border-white/8 rounded-3xl overflow-hidden flex flex-col group"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-white/5 overflow-hidden">
                    <img
                      src={design.generated_render_url}
                      alt={design.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className={`absolute top-3 left-3 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    <button
                      onClick={() => handleDelete(design.id)}
                      disabled={deleting === design.id}
                      className="absolute top-3 right-3 p-1.5 rounded-xl bg-black/40 text-white/40 hover:text-red-400 hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <h3 className="font-semibold text-sm truncate">{design.name || "Untitled Design"}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {design.style && (
                          <span className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                            {design.style}
                          </span>
                        )}
                        {design.color_palette && (
                          <span className="text-xs bg-white/5 border border-white/10 text-white/40 px-2 py-0.5 rounded-full">
                            {design.color_palette}
                          </span>
                        )}
                        {design.vibes?.map((v) => (
                          <span key={v} className="text-xs bg-white/5 border border-white/10 text-white/30 px-2 py-0.5 rounded-full">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>

                    {(design.budget_min || design.budget_max) && (
                      <p className="text-xs text-white/30">
                        Budget: £{design.budget_min?.toLocaleString()} – £{design.budget_max?.toLocaleString()}
                      </p>
                    )}

                    {design.generation_prompt && (
                      <p className="text-xs text-white/20 line-clamp-2 leading-relaxed italic">
                        "{design.generation_prompt}"
                      </p>
                    )}

                    <button
                      onClick={() => navigate(createPageUrl(`Design?id=${design.id}`))}
                      className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-medium transition-all"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Shop this look
                    </button>
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