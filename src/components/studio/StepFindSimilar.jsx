import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Camera, Search, Loader2, X, ExternalLink, Crown, Sparkles, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Build real retailer search URLs from a precise search term
function buildSearchUrls(searchTerm) {
  const q = encodeURIComponent(searchTerm);
  return {
    amazon:   `https://www.amazon.de/s?k=${q}&tag=ambient019-21`,
    ikea:     `https://www.ikea.com/de/de/search/?q=${q}`,
    google:   `https://www.google.com/search?tbm=shop&q=${q}`,
  };
}

export default function StepFindSimilar({ user, credits }) {
  const [image, setImage]         = useState(null);
  const [preview, setPreview]     = useState(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults]     = useState(null);
  const [error, setError]         = useState(null);
  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

  const isPro = credits?.plan_type === "pro";

  const handleFile = (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setImage(file);
    setResults(null);
    setError(null);
  };

  const handleSearch = async () => {
    if (!image) return;
    setSearching(true);
    setError(null);
    setResults(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: image });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a precise furniture and home decor product identification expert.

Analyze this image carefully and identify the MAIN furniture or decor item shown.

For each match, provide a SPECIFIC, REAL, SEARCHABLE product name that will return
good results on Amazon.de and IKEA — e.g. "velvet 2-seater sofa beige" NOT just "sofa".
Include material, colour, and style in the search term where visible.

Return 4 matches maximum. Only include items that genuinely resemble what is in the photo.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            identified_item: { type: "string", description: "Short plain-English name of the item, e.g. 'Arc floor lamp in brushed brass'" },
            style_description: { type: "string", description: "One sentence about the style and material visible" },
            matches: {
              type: "array",
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  title:       { type: "string", description: "Specific product title that reads naturally, e.g. 'IKEA HEKTAR pendant lamp black'" },
                  search_term: { type: "string", description: "Optimised Amazon/IKEA search string with material+colour+type, e.g. 'black metal pendant lamp adjustable cord'" },
                  price_range: { type: "string", description: "Realistic price range e.g. '€30–€80'" },
                  source:      { type: "string", enum: ["Amazon", "IKEA", "Google Shopping"] },
                  why_similar: { type: "string", description: "One short sentence on why this matches" },
                },
                required: ["title", "search_term", "source"],
              },
            },
          },
          required: ["identified_item", "matches"],
        },
      });

      // Build real, clickable search URLs from the precise search_term
      const enriched = (result.matches || []).map((m) => {
        const urls = buildSearchUrls(m.search_term || m.title);
        const url  = m.source === "IKEA"
          ? urls.ikea
          : m.source === "Google Shopping"
          ? urls.google
          : urls.amazon;
        return { ...m, search_url: url, all_urls: urls };
      });

      setResults({ item: result.identified_item, style: result.style_description, matches: enriched });
    } catch {
      setError("Could not identify the item. Please try a clearer, well-lit photo.");
    }
    setSearching(false);
  };

  const clearImage = () => {
    setPreview(null);
    setImage(null);
    setResults(null);
    setError(null);
  };

  // ─── Pro gate ───────────────────────────────────────────────────────────────
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

  // ─── Main UI ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <p className="text-white/40 text-sm mb-5">
        Take or upload a photo of any furniture or decor item — AI will identify it and find similar products to buy right now.
      </p>

      {/* Upload area */}
      {!preview ? (
        <div className="space-y-3">
          {/* Drag-and-drop / gallery area */}
          <label
            className="flex flex-col items-center justify-center gap-4 rounded-3xl cursor-pointer transition-all duration-300 min-h-[180px] hover:border-amber-500/50"
            style={{ border: "2px dashed rgba(201,150,58,0.35)", background: "rgba(201,150,58,0.03)" }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {/* Hidden camera-only input for mobile */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,150,58,0.1)", border: "1px solid rgba(201,150,58,0.2)" }}>
              <Upload className="w-6 h-6" style={{ color: "#C9963A" }} />
            </div>
            <div className="text-center px-4">
              <p className="text-white/70 font-semibold text-sm">Upload a photo of any item</p>
              <p className="text-white/30 text-xs mt-1">Furniture, lamp, rug, art — anything home-related</p>
            </div>
          </label>

          {/* Explicit camera button for mobile */}
          <button
            onClick={() => cameraRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-80 sm:hidden"
            style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.25)", color: "#C9963A" }}
          >
            <Camera className="w-4 h-4" />
            Take a Photo
          </button>
        </div>
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
      {preview && !searching && !results && (
        <button
          onClick={handleSearch}
          className="mt-4 w-full flex items-center justify-center gap-2 text-white font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #C9963A, #a8782e)" }}
        >
          <Search className="w-4 h-4" /> Find Similar Products
        </button>
      )}

      {/* Searching state */}
      {searching && (
        <div className="mt-4 flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#C9963A" }} />
          <p className="text-white/40 text-sm">Identifying item and searching online…</p>
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
        {results?.matches?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 space-y-4"
          >
            {/* Identified item card */}
            <div className="p-4 rounded-2xl" style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(201,150,58,0.7)" }}>Identified Item</p>
              <p className="text-white font-semibold text-sm">{results.item}</p>
              {results.style && <p className="text-white/40 text-xs mt-1">{results.style}</p>}
            </div>

            {/* Match cards */}
            <div className="space-y-3">
              {results.matches.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-2xl border border-white/8 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  {/* Header row */}
                  <div className="flex items-start gap-3 p-4 pb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/85">{m.title}</p>
                      {m.why_similar && (
                        <p className="text-xs text-white/30 mt-0.5">{m.why_similar}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {m.price_range && (
                        <span className="text-xs font-bold" style={{ color: "#C9963A" }}>{m.price_range}</span>
                      )}
                    </div>
                  </div>

                  {/* Shop buttons row — all three retailers */}
                  <div className="flex items-center gap-2 px-4 pb-4">
                    {[
                      { label: "Amazon", url: m.all_urls.amazon, bg: "rgba(255,153,0,0.12)", border: "rgba(255,153,0,0.25)", color: "#FF9900" },
                      { label: "IKEA",   url: m.all_urls.ikea,   bg: "rgba(0,88,163,0.12)",  border: "rgba(0,88,163,0.3)",   color: "#6BA3D6" },
                      { label: "Google", url: m.all_urls.google,  bg: "rgba(66,133,244,0.1)", border: "rgba(66,133,244,0.25)", color: "#7EB3F8" },
                    ].map(({ label, url, bg, border, color }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:opacity-60"
                        style={{ background: bg, border: `1px solid ${border}`, color }}
                      >
                        <ShoppingBag className="w-3 h-3" /> {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
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
