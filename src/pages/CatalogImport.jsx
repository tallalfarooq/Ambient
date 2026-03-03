import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";

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
    // Handle multi-line quoted fields
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
  const [status, setStatus] = useState("idle"); // idle | parsing | importing | done | error
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("parsing");
    setError(null);
    setStats(null);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      // Filter to furniture/home decor items with valid ASINs
      const filtered = rows.filter(r => {
        const asin = r.asin || r.input_asin || "";
        if (!asin || asin.length < 6) return false;
        const price = parsePrice(r.final_price);
        if (!price || price <= 0) return false;
        return isFurnitureRelated(r.title || "", r.categories || "");
      });

      setStats({ total: rows.length, filtered: filtered.length, imported: 0 });
      setStatus("importing");

      // Import in batches of 50
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

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Product Catalog Import</h1>
            <p className="text-white/40 text-xs">Upload your Amazon CSV to populate the local search engine</p>
          </div>
        </div>

        {status === "idle" && (
          <label className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/15 rounded-3xl p-12 cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all">
            <Upload className="w-10 h-10 text-white/25" />
            <div className="text-center">
              <p className="text-white/70 font-medium">Drop your amazon-products.csv here</p>
              <p className="text-white/30 text-sm mt-1">Only furniture & home decor items will be imported</p>
            </div>
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
        )}

        {(status === "parsing" || status === "importing") && (
          <div className="border border-white/8 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <div>
              <p className="font-medium">{status === "parsing" ? "Parsing CSV…" : "Importing products…"}</p>
              {stats && (
                <p className="text-white/40 text-sm mt-1">
                  {stats.imported} / {stats.filtered} furniture items imported
                  {stats.total > 0 && ` (filtered from ${stats.total} total rows)`}
                </p>
              )}
              {status === "importing" && (
                <div className="w-full bg-white/5 rounded-full h-2 mt-4 overflow-hidden">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {status === "done" && stats && (
          <div className="border border-emerald-500/20 bg-emerald-500/8 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <div>
              <p className="font-bold text-emerald-400 text-lg">Import Complete!</p>
              <p className="text-white/60 text-sm mt-1">
                {stats.imported} furniture & home decor products added to your local catalog
              </p>
              <p className="text-white/30 text-xs mt-1">
                (skipped {stats.total - stats.filtered} non-furniture rows)
              </p>
            </div>
            <button
              onClick={() => { setStatus("idle"); setStats(null); setProgress(0); }}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors mt-2"
            >
              Import another file
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="border border-red-500/20 bg-red-500/8 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <div>
              <p className="font-bold text-red-400">Import Failed</p>
              <p className="text-white/50 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setStatus("idle")}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-6 p-4 rounded-2xl bg-white/3 border border-white/6">
          <p className="text-white/40 text-xs leading-relaxed">
            <span className="text-white/60 font-medium">How it works:</span> The importer extracts furniture & home decor items, builds your affiliate URL (<code className="text-violet-400">amazon.com/dp/ASIN?tag=ambient019-21</code>), and stores them locally. The AI then searches this catalog first before generating product suggestions.
          </p>
        </div>
      </div>
    </div>
  );
}