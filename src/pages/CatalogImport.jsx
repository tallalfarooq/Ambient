import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, CheckCircle2, AlertCircle, Loader2, Database, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const AMAZON_TAG = "ambient019-21";
const FURNITURE_KEYWORDS = [
  "furniture", "sofa", "couch", "chair", "table", "desk", "shelf", "bookcase",
  "lamp", "light", "lighting", "rug", "curtain", "pillow", "cushion", "bed",
  "mattress", "dresser", "cabinet", "wardrobe", "mirror", "wall decor", "wall panel",
  "acoustic", "vase", "storage", "ottoman", "bench", "nightstand", "coffee table",
  "dining", "stool", "rack", "home decor", "home & kitchen", "patio", "garden",
  "tools & home improvement"
];

function isFurnitureRelated(title, categories) {
  const hay = `${title} ${categories}`.toLowerCase();
  return FURNITURE_KEYWORDS.some(kw => hay.includes(kw));
}

function parsePrice(raw) {
  if (!raw || raw === "null") return null;
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseCsv(text) {
  const lines = text.split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const rows = [];
  let i = 1;
  while (i < lines.length) {
    let line = lines[i];
    while ((line.match(/"/g) || []).length % 2 !== 0 && i < lines.length - 1) {
      i++;
      line += "\n" + lines[i];
    }
    const cols = [];
    let inQuote = false;
    let cur = "";
    for (let c of line) {
      if (c === '"') { inQuote = !inQuote; }
      else if (c === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
      else { cur += c; }
    }
    cols.push(cur.trim());
    if (cols.length >= headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ""; });
      rows.push(row);
    }
    i++;
  }
  return rows;
}

export default function CatalogImport() {
  const [user, setUser] = useState(undefined);
  const [status, setStatus] = useState("idle");
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("parsing");
    setError(null);
    setStats(null);

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const filtered = rows.filter(r => {
        const asin = r.asin || r.input_asin || "";
        if (!asin || asin.length < 6) return false;
        const price = parsePrice(r.final_price);
        if (!price || price <= 0) return false;
        return isFurnitureRelated(r.title || "", r.categories || "");
      });

      setStats({ total: rows.length, filtered: filtered.length, imported: 0 });
      setStatus("importing");

      const BATCH = 50;
      let imported = 0;
      for (let b = 0; b < filtered.length; b += BATCH) {
        const batch = filtered.slice(b, b + BATCH).map(r => {
          const asin = (r.asin || r.input_asin || "").replace(/"/g, "").trim();
          const price = parsePrice(r.final_price);
          const imageUrl = (r.image_url || "").replace(/"/g, "").trim();
          const cats = (r.categories || "").replace(/"/g, "").trim();
          return {
            asin,
            title: (r.title || "").replace(/"/g, "").trim(),
            price_usd: price,
            categories: cats,
            image_url: imageUrl || null,
            affiliate_url: `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`,
            style_keywords: ""
          };
        });
        await base44.entities.ProductCatalog.bulkCreate(batch);
        imported += batch.length;
        setProgress(Math.round((imported / filtered.length) * 100));
        setStats(s => ({ ...s, imported }));
      }
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      </div>
    );
  }

  // Not admin — access denied
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-9 h-9 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Admin Access Only</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            The Product Catalog Import tool is restricted to platform administrators.<br />
            It is used to seed the AI product database.
          </p>
          <Link
            to={createPageUrl("Home")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/8 border border-white/10 text-white/70 hover:text-white hover:bg-white/12 transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs text-white/30 mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-violet-400 font-semibold">Admin Panel</span>
            <span>/</span>
            <span>Product Catalog</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Product Catalog Import</h1>
              <p className="text-white/40 text-sm mt-1">
                Upload an Amazon CSV to seed the AI product matching database. Only furniture & home décor items are imported.
              </p>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div
          className="rounded-3xl p-8 mb-6"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {status === "idle" && (
            <label className="flex flex-col items-center justify-center gap-5 border-2 border-dashed border-white/10 rounded-2xl p-14 cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/4 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-white/80 font-semibold text-base">Drop your amazon-products.csv here</p>
                <p className="text-white/30 text-sm mt-1.5">Or click to browse — only .csv files accepted</p>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full border border-violet-500/25 text-violet-400 bg-violet-500/8">
                Furniture & home décor only
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </label>
          )}

          {(status === "parsing" || status === "importing") && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              <div>
                <p className="font-semibold text-lg">{status === "parsing" ? "Parsing CSV…" : "Importing products…"}</p>
                {stats && (
                  <p className="text-white/40 text-sm mt-2">
                    {stats.imported.toLocaleString()} / {stats.filtered.toLocaleString()} items
                    {stats.total > 0 && <span className="text-white/25"> · {stats.total.toLocaleString()} total rows scanned</span>}
                  </p>
                )}
              </div>
              {status === "importing" && (
                <div className="w-full max-w-xs">
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
                      }}
                    />
                  </div>
                  <p className="text-white/25 text-xs text-center mt-2">{progress}% complete</p>
                </div>
              )}
            </div>
          )}

          {status === "done" && stats && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-xl text-emerald-400">Import Complete</p>
                <p className="text-white/60 text-sm mt-2">
                  <span className="text-white font-semibold">{stats.imported.toLocaleString()}</span> products added to the catalog
                </p>
                <p className="text-white/25 text-xs mt-1">
                  {(stats.total - stats.filtered).toLocaleString()} non-furniture rows skipped
                </p>
              </div>
              <button
                onClick={() => { setStatus("idle"); setStats(null); setProgress(0); }}
                className="px-5 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white/70 hover:text-white hover:bg-white/12 transition-all text-sm font-medium"
              >
                Import another file
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <p className="font-bold text-xl text-red-400">Import Failed</p>
                <p className="text-white/50 text-sm mt-2 font-mono text-xs bg-white/5 px-4 py-2 rounded-xl border border-white/8 max-w-sm">{error}</p>
              </div>
              <button
                onClick={() => setStatus("idle")}
                className="px-5 py-2.5 rounded-xl bg-white/8 border border-white/10 text-white/70 hover:text-white hover:bg-white/12 transition-all text-sm font-medium"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5 rounded-2xl bg-white/2 border border-white/6">
          <p className="text-white/35 text-xs leading-relaxed">
            <span className="text-white/55 font-semibold">How it works:</span> The importer parses your Amazon CSV, filters for furniture & home décor items, constructs affiliate URLs{" "}
            <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded text-[10px]">amazon.com/dp/ASIN?tag=ambient019-21</code>{" "}
            and stores them in the ProductCatalog entity. The AI searches this catalog first when generating product suggestions for users.
          </p>
        </div>
      </div>
    </div>
  );
}