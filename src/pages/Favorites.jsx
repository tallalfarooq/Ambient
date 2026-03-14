import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, Sparkles, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Favorites() {
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const saved = await base44.entities.SavedDesign.filter({ user_email: currentUser.email });
        setSavedDesigns(saved);

        if (saved.length > 0) {
          const designIds = saved.map((s) => s.design_id);
          const designData = await Promise.all(
            designIds.map((id) => base44.entities.RoomDesign.filter({ id }).then((d) => d[0]))
          );
          setDesigns(designData.filter(Boolean));
        }
      } catch (err) {
        console.error('Failed to load favorites:', err);
        base44.auth.redirectToLogin(window.location.href);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const handleRemove = async (savedId, designId) => {
    try {
      await base44.entities.SavedDesign.delete(savedId);
      setSavedDesigns((prev) => prev.filter((s) => s.id !== savedId));
      setDesigns((prev) => prev.filter((d) => d.id !== designId));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Saved Designs</h1>
              <p className="text-white/40 text-sm mt-1">
                Your favorite room concepts and inspirations
              </p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {designs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <Heart className="w-9 h-9 text-white/20" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No saved designs yet</h2>
            <p className="text-white/40 mb-6 max-w-md">
              Start creating room designs and save your favorites by clicking the heart icon.
            </p>
            <button
              onClick={() => navigate(createPageUrl("Studio"))}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              Create Your First Design
            </button>
          </div>
        )}

        {/* Grid of saved designs */}
        {designs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((design, i) => {
              const saved = savedDesigns.find((s) => s.design_id === design.id);
              return (
                <motion.div
                  key={design.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative rounded-3xl overflow-hidden border border-white/10 bg-white/3 hover:border-violet-500/30 transition-all duration-300"
                >
                  <Link to={createPageUrl("Design") + `?id=${design.id}`} className="block">
                    <div className="relative aspect-video overflow-hidden bg-white/5">
                      {design.generated_render_url ? (
                        <img
                          src={design.generated_render_url}
                          alt={design.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-white/10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="p-5">
                      <h3 className="font-semibold text-base mb-1 truncate group-hover:text-violet-300 transition-colors">
                        {design.name}
                      </h3>
                      <p className="text-white/40 text-sm mb-3">
                        {design.style} · €{design.budget_min?.toLocaleString()}–€{design.budget_max?.toLocaleString()}
                      </p>
                      {saved?.notes && (
                        <p className="text-white/30 text-xs italic line-clamp-2">{saved.notes}</p>
                      )}
                    </div>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove(saved.id, design.id);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Saved badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/20 backdrop-blur-sm border border-pink-500/40">
                    <Heart className="w-3 h-3 text-pink-300 fill-current" />
                    <span className="text-[10px] font-semibold text-pink-300">Saved</span>
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