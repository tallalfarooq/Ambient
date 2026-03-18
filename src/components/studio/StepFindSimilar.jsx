import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Search, Loader2, X, ExternalLink, Lock, Crown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StepFindSimilar({ user, credits }) {
  const [image, setImage]       = useState(null);
  const [preview, setPreview]   = useState(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults]   = useState([]);
  const [error, setError]       = useState(null);
  const fileRef = useRef(null);

  const isPro = credits?.plan_type === "pro";

  const handleFile = async (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setImage(file);
    setResults([]);
    setError(null);
  };

  const handleSearch = async () => {
    if (!image) return;
    setSearching(true);
    setError(null);
    setResults([]);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: image });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a furniture and home decor product identification expert.
Analyze this image and identify the main furniture or decor item shown.
Then provide 4-6 realistic product matches that look similar, with real-looking product details.
Focus on the most prominent item in the image.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            identified_item: { type: "string" },
            style_description: { type: "string" },
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title:      { type: "string" },
                  price:      { type: "number" },
                  source:     { type: "string" },
                  search_url: { type: "string" },
                  why_similar: { type: "string" },
                },
              },
            },
          },
        },
      });

      // Build real search URLs
      const enriched = (result.matches || []).map((m) => {
        const q = encodeURIComponent(m.title);
        const url =
          m.source === "IKEA"
            ? `https://www.ikea.com/de/de/search/?q=${q}`
            : `https://www.amazon.de/s?k=${q}&tag=ambient019-21`;
        return { ...m, search_url: url };
      });

      setResults({ item: result.identified_item, style: result.style_description, matches: enriched });
    } catch (err) {
      setError("Could not identify the item. Please try a clearer photo.");
    }
    setSearching(false);
  };

  const clearImage = () => {
    setPreview(null);
    setImage(null);
    setResults([]);
    setError(null);
  };

  // Not Pro — show upgrade prompt
  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.25)" }}>
          <Crown className="w-8 h-8" style={{ color: "#C9963A" }} />
        </div>
        <div>
          <h3 className="text-lg font-bold mb-2">Pro Feature</h3>
          <p className="text-white/40 text-sm max-w-xs leading-relaxed">
            Snap a photo of any furniture or decor item and AI finds exact or similar products to buy online — instantly.
          </p>
        </div>
        <div className="w-full rounded-2xl border border-white/8 bg-white/3 p-4 text-left space-y-2">
          {["Photo → instant product match", "Amazon & IKEA search links", "Style description & alternatives", "Unlimited searches"].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-white/50">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#C9963A" }} />
              {f}
            </div>
          ))}
        </div>
        <Link
          to={createPageUrl("Pricing")}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #C9963A, #a8782e)" }}
        >
          <Crown className="w-4 h-4" /> Upgrade to Pro — €20
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-white/40 text-sm mb-5">
        Take a photo of any furniture or decor item — anywhere — and AI will find similar products you can buy right now.
      </p>

      {/* Upload area */}
      {!preview ? (
        <label
          className="flex flex-col items-center justify-center gap-4 rounded-3xl cursor-pointer transition-all duration-300 min-h-[220px]"
          style={{
            border: "2px dashed rgba(201,150,58,0.35)",
            background: "rgba(201,150,58,0.03)",
          }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}>
            <Upload className="w-6 h-6" style={{ color: "#C9963A" }} />
          </div>
          <div className="text-center">
            <p className="text-white/70 font-semibold">Upload a photo of any item</p>
            <p className="text-white/30 text-xs mt-1">Furniture, lamp, rug, art — anything home-related</p>
          </div>
        </label>
      ) : (
        <div className="relative rounded-3xl overflow-hidden border border-white/10 mb-4">
          <img src={preview} alt="Item" className="w-full max-h-72 object-contain bg-black/30" />
          <button
            onClick={clearImage}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}

      {/* Search button */}
      {preview && !searching && results.length === 0 && (
        <button
          onClick={handleSearch}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity"
        >
          <Search className="w-4 h-4" /> Find Similar Products
        </button>
      )}

      {/* Searching state */}
      {searching && (
        <div className="mt-4 flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-white/40 text-sm">Identifying item and finding matches…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {results.matches?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 space-y-4"
          >
            <div className="p-4 rounded-2xl bg-amber-500/8 border border-amber-500/20">
              <p className="text-xs text-amber-400/70 font-semibold uppercase tracking-wider mb-1">Identified Item</p>
              <p className="text-white font-semibold text-sm">{results.item}</p>
              {results.style && <p className="text-white/40 text-xs mt-1">{results.style}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {results.matches.map((m, i) => (
                <motion.a
                  key={i}
                  href={m.search_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{m.title}</p>
                    {m.why_similar && (
                      <p className="text-xs text-white/30 mt-0.5 truncate">{m.why_similar}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {m.price && (
                      <span className="text-sm font-bold text-amber-400">
                        €{m.price.toLocaleString()}
                      </span>
                    )}
                    <span className="text-[10px] bg-white/8 px-2 py-1 rounded-full text-white/50">
                      {m.source || "Amazon"}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-amber-400 transition-colors" />
                  </div>
                </motion.a>
              ))}
            </div>

            <button
              onClick={clearImage}
              className="w-full text-sm text-white/30 hover:text-white/60 transition-colors py-2"
            >
              Search another item →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}