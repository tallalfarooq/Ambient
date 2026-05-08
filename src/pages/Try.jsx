import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Upload, Loader2, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/api/supabase";
import { apiClient } from "@/api/apiClient";
import { createPageUrl } from "@/utils";

/**
 * /Try — public, no-auth landing page for the email-gated free render.
 *
 * Day 8.2 — purpose: drop the upfront sign-up wall. Users land here from
 * the home Hero CTA "Try free, no signup". Flow:
 *
 *   1. Drop a room photo (uploaded to Supabase 'uploads' bucket)
 *   2. Pick a style from a small chip list
 *   3. Enter email
 *   4. Click "Generate my free design"
 *   5. /api/tryFree returns the watermarked render
 *   6. After viewing, user is offered "Sign up to download HD + 2 more credits"
 *
 * One render per email (server-enforced via try_leads unique index).
 * Rendered in lower-res with a watermark — full HD/clean version requires
 * sign-up, which is the activation funnel we're optimizing for.
 */

const STYLES = [
  { id: "Japandi",            label: "Japandi" },
  { id: "Scandinavian",       label: "Scandi" },
  { id: "Mid-Century Modern", label: "Mid-Century" },
  { id: "Industrial",         label: "Industrial" },
  { id: "Boho",               label: "Boho" },
  { id: "Modern Minimal",     label: "Modern Minimal" },
  { id: "Cottagecore",        label: "Cottagecore" },
  { id: "Art Deco",           label: "Art Deco" },
];

export default function Try() {
  const fileInputRef = useRef(null);
  const [photoUrl, setPhotoUrl]     = useState(null);
  const [photoFile, setPhotoFile]   = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [style, setStyle]           = useState("Japandi");
  const [email, setEmail]           = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult]         = useState(null);
  const [reused, setReused]         = useState(false);
  const [error, setError]           = useState(null);
  const [mode, setMode]             = useState("redesign");

  const onFile = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("Please upload an image file (JPG, PNG, HEIC).");
      return;
    }
    setError(null);
    setPhotoFile(file);
    setUploading(true);
    try {
      // Use the public 'try-uploads' bucket — anyone can read these. We
      // accept the privacy trade because /Try is a logged-out flow and the
      // photos uploaded here should be considered shareable (the user is
      // doing this expecting a public preview).
      const fileName = `try-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: uploadErr } = await supabase.storage
        .from("uploads")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(fileName);
      setPhotoUrl(pub.publicUrl);
    } catch (err) {
      setError("Upload failed. Please try a different photo or smaller file.");
      setPhotoFile(null);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!photoUrl || !email.trim() || generating) return;
    setError(null);
    setGenerating(true);
    try {
      const resp = await fetch("/api/tryFree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source_url: photoUrl,
          style,
          mode,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setError(json.error || "Generation failed. Please try again.");
        return;
      }
      setResult(json.url);
      setReused(!!json.reused);
    } catch (err) {
      setError("Network error. Please retry.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-white">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-10">
          <span className="inline-block text-eyebrow uppercase tracking-wider text-accent-teal-light mb-4">
            Free preview — no signup
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5">
            Try Ambient Space.
            <br />
            <span style={{
              background: "linear-gradient(135deg, #6EC6C6, #C9963A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Free, in 30 seconds.
            </span>
          </h1>
          <p className="text-white/55 max-w-2xl mx-auto leading-relaxed">
            Upload your room. Pick a style. Get a photoreal AI redesign — no credit card,
            no signup. We'll send the HD version to your email if you want it.
          </p>
        </div>

        {!result ? (
          /* Day 9.3 — all four steps are always visible (with a numbered
              indicator) so users see the full commitment upfront. Steps 2-4
              are visually muted-but-readable until the photo is uploaded,
              avoiding the "is this all there is?" bounce risk that came
              from hiding fields behind {photoUrl &&}. */
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Step 1 — Upload */}
            <Step number={1} label="Upload your room photo" active={!photoUrl} done={!!photoUrl}>
              <div
                onClick={() => !uploading && !photoUrl && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
                className={`relative rounded-3xl overflow-hidden transition-all ${photoUrl ? "" : "cursor-pointer hover:bg-white/5"}`}
                style={{
                  background: photoUrl ? "transparent" : "rgba(255,255,255,0.03)",
                  border: `1px ${photoUrl ? "solid" : "dashed"} rgba(255,255,255,${photoUrl ? "0.1" : "0.15"})`,
                  aspectRatio: photoUrl ? "auto" : "16/9",
                  minHeight: photoUrl ? 0 : 200,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFile(e.target.files?.[0])}
                  className="hidden"
                />
                {photoUrl ? (
                  <div className="relative">
                    <img src={photoUrl} alt="Your room" className="w-full h-auto object-contain max-h-[420px]" />
                    <button
                      onClick={() => { setPhotoUrl(null); setPhotoFile(null); }}
                      className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-xl bg-black/60 text-white/80 hover:text-white backdrop-blur-sm border border-white/10"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                    {uploading ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1B8FA0" }} />
                        <p className="text-sm text-white/60">Uploading…</p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ background: "rgba(27,143,160,0.15)", border: "1px solid rgba(27,143,160,0.3)" }}>
                          <Upload className="w-5 h-5" style={{ color: "#6EC6C6" }} />
                        </div>
                        <p className="text-sm text-white/85 font-semibold">Drop your room photo or click to browse</p>
                        <p className="text-[11px] text-white/35">JPG, PNG, HEIC · max 20MB</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Step>

            {/* Step 2 — Mode + Style */}
            <Step number={2} label="Pick a style" active={!!photoUrl && !style} done={!!photoUrl && !!style} disabled={!photoUrl}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "redesign", label: "Redesign my room", desc: "Keep walls, change furniture" },
                    { id: "furnish",  label: "Furnish empty room", desc: "Add furniture to empty space" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      disabled={!photoUrl}
                      className="text-left px-4 py-3 rounded-2xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={
                        mode === m.id
                          ? { borderColor: "#6EC6C6", background: "rgba(110,198,198,0.08)", color: "white" }
                          : { borderColor: "rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.55)" }
                      }
                    >
                      <p className="text-sm font-semibold">{m.label}</p>
                      <p className="text-[11px] mt-0.5 opacity-70">{m.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStyle(s.id)}
                      disabled={!photoUrl}
                      className="text-xs px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={
                        style === s.id
                          ? { borderColor: "#C9963A", background: "rgba(201,150,58,0.15)", color: "white" }
                          : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </Step>

            {/* Step 3 — Email */}
            <Step number={3} label="Where should we send your design?" active={!!photoUrl && !email.trim()} done={!!email.trim()} disabled={!photoUrl}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={!photoUrl}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#1B8FA0]/60 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-[11px] text-white/30 mt-2">
                One free preview per email. We&apos;ll email you the HD version once you sign up free.
              </p>
            </Step>

            {error && (
              <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
                {error}
              </div>
            )}

            {/* Step 4 — Generate */}
            <button
              onClick={submit}
              disabled={!photoUrl || !email.trim() || generating}
              className="w-full flex items-center justify-center gap-2 font-bold px-7 py-4 rounded-2xl text-[#0A0A12] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your design…</> : <><Sparkles className="w-4 h-4" /> Generate my free design</>}
            </button>
          </div>
        ) : (
          /* Result view */
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="rounded-3xl overflow-hidden border border-white/10">
              <img src={result} alt="AI redesign" className="w-full h-auto" />
            </div>

            <div className="px-5 py-4 rounded-2xl flex items-start gap-3"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.22)" }}>
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-emerald-400">
                  {reused ? "Welcome back" : "Your free preview is ready"}
                </p>
                <p className="text-xs text-white/55 mt-1 leading-relaxed">
                  {reused
                    ? "This is the design we generated for your email last time. Sign up to render new designs and download HD watermark-free versions."
                    : "This is a watermarked preview. Sign up free to download HD without the watermark and get 2 more designs on us."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => apiClient.auth.redirectToLogin("/Studio")}
                className="flex items-center justify-center gap-2 font-bold px-7 py-4 rounded-2xl text-[#0A0A12] transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
              >
                <Sparkles className="w-4 h-4" /> Sign up free + 2 designs
              </button>
              <Link
                to={createPageUrl("Home")}
                className="flex items-center justify-center gap-2 font-semibold px-7 py-4 rounded-2xl text-white/80 border border-white/10 hover:bg-white/5 transition-colors"
              >
                Back to home
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Step — labeled wrapper that shows a numbered indicator + status
 * (active / done / disabled) so the full flow is visible upfront.
 * Day 9.3 — fixes the bounce risk where users couldn't see what they'd
 * need to provide until after photo upload.
 */
function Step({ number, label, active, done, disabled, children }) {
  const ringColor =
    done ? "#10B981" :
    active ? "#6EC6C6" :
    "rgba(255,255,255,0.15)";
  const numberBg =
    done ? "rgba(16,185,129,0.18)" :
    active ? "rgba(110,198,198,0.18)" :
    "rgba(255,255,255,0.05)";
  const numberColor =
    done ? "#10B981" :
    active ? "#6EC6C6" :
    "rgba(255,255,255,0.35)";
  const labelColor = disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.85)";

  return (
    <div
      className="rounded-3xl p-5 transition-opacity"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${ringColor}`,
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: numberBg, color: numberColor, border: `1px solid ${ringColor}` }}
        >
          {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : number}
        </div>
        <p className="text-sm font-semibold" style={{ color: labelColor }}>
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}
