import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, RefreshCw, ThumbsUp, ThumbsDown, BookmarkCheck, Download, Share2, CreditCard } from "lucide-react";

const buildPrompt = (data) => {
  const dims = data.room_dimensions;
  const vibeStr = data.vibes?.length ? `, ${data.vibes.join(", ")} atmosphere` : "";
  const dimStr = dims ? `, ${dims.width}m x ${dims.length}m x ${dims.height}m room` : "";
  const cal = data.scale_calibration;
  const scaleStr = cal ? `, reference scale: ${cal.label} is ${cal.meters}m` : "";
  return (
    `Interior design photograph, ${data.style} style, ${data.color_palette} color palette${dimStr}${scaleStr}, ` +
    `photorealistic room render, natural lighting, high-end furniture, ultra-detailed, 8K, architectural photography style, ` +
    `ControlNet depth guidance, layered furniture placement, magazine quality${vibeStr}`
  );
};

function BeforeAfterSlider({ before, after }) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);

  const clamp = (v) => Math.max(0, Math.min(100, v));

  const updateFromClientX = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onMouseDown = (e) => { setDragging(true); updateFromClientX(e.clientX); };
  const onMouseMove = (e) => { if (dragging) updateFromClientX(e.clientX); };
  const onMouseUp   = ()  => setDragging(false);
  const onTouchStart = (e) => { setDragging(true); updateFromClientX(e.touches[0].clientX); };
  const onTouchMove  = (e) => { if (dragging) updateFromClientX(e.touches[0].clientX); };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-3xl overflow-hidden border border-white/10 select-none cursor-ew-resize"
      style={{ aspectRatio: "16/9" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      <img
        src={after}
        alt="After"
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${pos}%` }}
      >
        <img
          src={before}
          alt="Before"
          draggable={false}
          className="absolute inset-0 h-full object-cover pointer-events-none"
          style={{ width: containerRef.current?.offsetWidth ?? "100%" }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5">
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
          </svg>
        </div>
      </div>
      <span className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/70 pointer-events-none">
        Before
      </span>
      <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-600/80 backdrop-blur-sm text-white pointer-events-none">
        After ✦
      </span>
    </div>
  );
}

export default function StepGenerate({ data, update, onBack, onComplete }) {
  const navigate = useNavigate();

  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [generated,    setGenerated]    = useState(data.generated_render_url || null);
  const [prompt,       setPrompt]       = useState(buildPrompt(data));
  const [intensity,    setIntensity]    = useState(data.intensity ?? 65);
  const [feedback,     setFeedback]     = useState(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [error,        setError]        = useState(null);
  const [progress,     setProgress]     = useState(0);
  const [copied,       setCopied]       = useState(false);
  const [credits,      setCredits]      = useState(null);
  const [user,         setUser]         = useState(null);
  const [checkingOut,  setCheckingOut]  = useState(false);

  useEffect(() => { setPrompt(buildPrompt(data)); }, [data.style, data.color_palette, data.vibes]);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const userCredits = await base44.entities.UserCredits.filter({ user_email: currentUser.email });
        if (userCredits.length > 0) {
          setCredits(userCredits[0]);
        } else {
          const newCredits = await base44.entities.UserCredits.create({
            user_email: currentUser.email,
            credits_remaining: 1,
            total_purchased: 0,
          });
          setCredits(newCredits);
        }
      } catch (err) {
        console.error('Failed to fetch credits:', err);
      }
    };
    fetchCredits();
  }, []);

  useEffect(() => {
    if (!loading) { setProgress(0); return; }
    setProgress(8);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 88) { clearInterval(t); return 88; }
        return p + Math.random() * 5;
      });
    }, 1800);
    return () => clearInterval(t);
  }, [loading]);

  const refinedPromptRef = useRef(prompt);
  useEffect(() => { refinedPromptRef.current = prompt; }, [prompt]);

  const generate = async () => {
    if (!data.room_image_url) {
      setError("Please go back and upload a room photo first.");
      return;
    }
    setError(null);
    setLoading(true);
    setFeedback(null);
    setFeedbackNote("");

    const refinedPrompt =
      feedback === "dislike" && feedbackNote
        ? `${prompt}, avoid: ${feedbackNote}`
        : prompt;

    const strength = intensity / 100;

    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: refinedPrompt,
        existing_image_urls: [data.room_image_url],
        options: { strength, guidance_scale: 7.5 },
      });

      const url = result?.url || result;
      if (!url) throw new Error("No image returned. Please try again.");

      setProgress(100);
      setGenerated(url);
      update({ generated_render_url: url, generation_prompt: refinedPrompt, intensity });
    } catch (err) {
      setError(err?.message || "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndShop = async () => {
    if (!generated) return;
    setSaving(true);
    try {
      const record = await base44.entities.RoomDesign.create({
        name:                 data.name || "My Room Design",
        style:                data.style,
        color_palette:        data.color_palette,
        vibes:                data.vibes,
        budget_min:           data.budget_min,
        budget_max:           data.budget_max,
        budget_tier:          data.budget_tier,
        sustainability_mode:  data.sustainability_mode,
        room_image_url:       data.room_image_url,
        room_file_url:        data.room_file_url,
        room_dimensions:      data.room_dimensions,
        generated_render_url: generated,
        generation_prompt:    refinedPromptRef.current || prompt,
        intensity,
        status: "ready",
      });
      navigate(createPageUrl(`Design`) + `?id=${record.id}`);
    } catch (err) {
      setError("Couldn't save. Please try again.");
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!generated) return;
    try {
      const resp = await fetch(generated);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `ambient-${data.style?.replace(/\s+/g, "-").toLowerCase() || "design"}-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(generated, "_blank");
    }
  };

  const handleShare = async () => {
    const shareText = `Check out my AI-designed room in the ${data.style} style — made with Ambient ✦`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Ambient Design", text: shareText, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share — ignore
    }
  };

  const intensityLabel =
    intensity < 35 ? "Subtle refresh"
    : intensity < 55 ? "Balanced redesign"
    : intensity < 75 ? "Bold transformation"
    : "Full reimagination";

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Generate your design</h2>
      <p className="text-white/40 text-sm mb-6">
        Stable Diffusion will paint your room in the{" "}
        <strong className="text-white/70">{data.style}</strong> style.
      </p>

      {/* Prompt editor */}
      <div className="mb-5">
        <label className="text-xs text-white/40 block mb-2">
          Generation prompt{" "}
          <span className="text-white/25">(editable — describe anything custom)</span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={loading}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/80
                     focus:outline-none focus:border-violet-500/50 resize-none leading-relaxed
                     disabled:opacity-50"
        />
      </div>

      {/* Intensity slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/40">Transformation intensity</label>
          <span className="text-xs font-semibold text-violet-400">{intensityLabel}</span>
        </div>
        <input
          type="range"
          min={20}
          max={90}
          value={intensity}
          onChange={(e) => setIntensity(parseInt(e.target.value))}
          disabled={loading}
          className="w-full accent-violet-500 disabled:opacity-40"
        />
        <div className="flex justify-between text-[10px] text-white/25 mt-1">
          <span>Keep original character</span>
          <span>Full reimagination</span>
        </div>
      </div>

      {/* Preview area */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 mb-6 min-h-[220px] flex items-center justify-center bg-white/3">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <p className="text-white/40 text-sm">Painting your room…</p>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white/25 text-xs">Usually 30–60 seconds</p>
          </div>
        ) : generated ? (
          <BeforeAfterSlider before={data.room_image_url} after={generated} />
        ) : (
          <div className="flex flex-col items-center gap-3 p-10">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-white/30 text-sm">Your AI render will appear here</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Feedback */}
      {generated && !loading && (
        <div className="mb-6 p-4 rounded-2xl bg-white/3 border border-white/8">
          <p className="text-xs text-white/40 mb-3">How does this look?</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFeedback(feedback === "like" ? null : "like")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                feedback === "like"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 text-white/40 hover:border-white/20"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Love it
            </button>
            <button
              onClick={() => setFeedback(feedback === "dislike" ? null : "dislike")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                feedback === "dislike"
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : "border-white/10 text-white/40 hover:border-white/20"
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> Not quite
            </button>
          </div>
          {feedback === "dislike" && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="What didn't work? (e.g. too dark, too many plants)"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs
                           text-white/70 placeholder-white/25 focus:outline-none focus:border-violet-500/50"
              />
              <p className="text-white/25 text-xs mt-1.5">Regenerate below to apply your feedback ↓</p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onBack}
          disabled={loading}
          className="bg-white/5 border border-white/10 text-white/70 px-5 py-4 rounded-2xl
                     hover:bg-white/8 transition-colors font-medium disabled:opacity-30"
        >
          Back
        </button>

        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 bg-white/8 border border-white/15 text-white/80
                     px-5 py-4 rounded-2xl hover:bg-white/12 transition-colors disabled:opacity-40 font-medium"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
          ) : generated ? (
            <><RefreshCw className="w-4 h-4" /> Regenerate</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate</>
          )}
        </button>

        {generated && !loading && (
          <>
            <button
              onClick={handleDownload}
              title="Download"
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/60
                         px-4 py-4 rounded-2xl hover:bg-white/10 hover:text-white transition-all font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={handleShare}
              title="Share"
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/60
                         px-4 py-4 rounded-2xl hover:bg-white/10 hover:text-white transition-all font-medium"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
            </button>

            <button
              onClick={handleSaveAndShop}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r
                         from-violet-500 to-pink-500 text-white font-semibold py-4 rounded-2xl
                         hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
              {saving ? "Saving…" : "Save & Shop this look"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}