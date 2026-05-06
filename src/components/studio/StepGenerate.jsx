import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { apiClient } from "@/api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, ThumbsUp, ThumbsDown, BookmarkCheck, Download, Share2, CreditCard, LogIn, Layers, Lock, Globe, Sliders, X, Search, ShoppingBag } from "lucide-react";
import { AMAZON_TAG } from "@/components/affiliateLinks";

// Burns watermark into the image using Canvas and returns a data URL
async function applyWatermarkToImage(imageUrl) {
  // Fetch image via proxy to avoid CORS tainting the canvas
  let blobUrl = imageUrl;
  try {
    const resp = await fetch(`/api/functions/proxyImage?url=${encodeURIComponent(imageUrl)}`);
    if (resp.ok) {
      const blob = await resp.blob();
      blobUrl = URL.createObjectURL(blob);
    }
  } catch {}

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // ── Pill dimensions ──────────────────────────────────────────
      const fontSize = Math.max(16, Math.round(img.width * 0.026));
      const font     = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      ctx.font = font;

      const label    = "Designed by Ambient Space";
      const labelW   = ctx.measureText(label).width;

      // Icon "✦" drawn in brand teal, measure separately
      const iconText = "✦  ";
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      const iconW  = ctx.measureText(iconText).width;
      const totalTextW = iconW + labelW;

      const padX  = fontSize * 1.1;
      const padY  = fontSize * 0.65;
      const boxW  = totalTextW + padX * 2;
      const boxH  = fontSize   + padY * 2;
      const r     = boxH / 2; // fully-rounded pill

      // ── True centre of the image ─────────────────────────────────
      const x = (img.width  - boxW) / 2;
      const y = (img.height - boxH) / 2;

      // ── Dark frosted-glass pill ──────────────────────────────────
      ctx.save();
      ctx.fillStyle = "rgba(10,10,11,0.72)";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, boxW, boxH, r);
      } else {
        // Fallback for older browsers
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + boxW - r, y);
        ctx.arcTo(x + boxW, y, x + boxW, y + r, r);
        ctx.lineTo(x + boxW, y + boxH - r);
        ctx.arcTo(x + boxW, y + boxH, x + boxW - r, y + boxH, r);
        ctx.lineTo(x + r, y + boxH);
        ctx.arcTo(x, y + boxH, x, y + boxH - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      }
      ctx.fill();

      // Subtle teal border
      ctx.strokeStyle = "rgba(27,143,160,0.55)";
      ctx.lineWidth   = Math.max(1, img.width * 0.0015);
      ctx.stroke();
      ctx.restore();

      // ── "✦" icon in brand teal ───────────────────────────────────
      const textX = x + padX;
      const textY = y + boxH / 2;
      ctx.textBaseline = "middle";
      ctx.font = font;
      ctx.fillStyle = "#1B8FA0";
      ctx.fillText(iconText, textX, textY);

      // ── "Designed by Ambient Space" in white ────────────────────
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(label, textX + iconW, textY);

      try {
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(imageUrl);
      }
      if (blobUrl !== imageUrl) URL.revokeObjectURL(blobUrl);
    };
    img.onerror = () => resolve(imageUrl);
    img.src = blobUrl;
  });
}

const ROOM_FURNITURE_CONTEXT = {
  "Living Room":  "sofa set, coffee table, accent armchair, TV media console, floor lamp, decorative rug, bookshelf or display shelving",
  "Bedroom":      "king or queen bed with upholstered headboard, two matching nightstands with bedside lamps, wardrobe or walk-in closet doors, dresser, bedroom rug at foot of bed",
  "Kitchen":      "kitchen island with bar stools, pendant lights hanging above island, open shelving on walls, small counter herb plants, kitchen trolley",
  "Dining Room":  "rectangular dining table, 4-6 matching dining chairs, sideboard or buffet cabinet against wall, statement chandelier centered above table, table runner and centerpiece",
  "Home Office":  "large wooden work desk, ergonomic office chair, tall bookshelf with books, adjustable task lamp, small potted plant, cable management accessories",
  "Bathroom":     "floating wall-mounted vanity, framed bathroom mirror with lighting, freestanding or built-in bathtub, towel rail, ceramic soap dispenser, bath mat",
  "Hallway":      "slim console table against wall, large round or rectangular wall mirror, coat rack or hooks, narrow runner rug, small decorative vase or plant",
  "Kids Room":    "children's single bed with safety rails and fun bedding, colorful storage unit with bins, kids study desk and chair, wall-mounted shelves with toys, play rug",
  "Outdoor":      "weather-resistant outdoor lounge sofa, outdoor coffee table, string or lantern lighting, large terracotta planters with plants, outdoor side table",
};

const STYLE_MAP = {
  "Japandi":           "neutral linen/cotton textiles, low-profile solid oak furniture, wabi-sabi ceramics, muted beige and sage color palette, minimalist open shelving, paper lantern and rattan pendant lighting",
  "Industrial":        "exposed brick or raw concrete walls, dark metal frame furniture, reclaimed wood tabletops, Edison bulb pendant lights, iron pipe shelving, leather and canvas upholstery",
  "Boho":              "rattan and wicker furniture, macramé wall hangings, layered patterned wool rugs, warm terracotta and rust tones, trailing indoor plants in clay pots, fringe and tassel accents",
  "Modern Minimal":    "white plaster walls, polished concrete or light oak floors, black powder-coated steel frame accents, floating open shelves, linen upholstery in cream or greige, sculptural geometric lighting",
  "Cottagecore":       "floral chintz print soft furnishings, distressed white-painted wood furniture, cream and dusty rose palette, vintage ceramic accessories, dried flower arrangements in glass vases",
  "Mid-Century Modern":"tapered splayed wooden legs in walnut, mustard yellow and teal fabric accents, organic curved forms, Eames-style lounge chairs, retro cone or globe pendant lights",
  "Art Deco":          "deep jewel-tone velvet upholstery in emerald or navy, polished gold and brass metallic accents, bold geometric tile patterns, marble surfaces, oversized statement mirror with gilded frame",
  "Scandi":            "white walls, pale birch and pine wood furniture, functional Shaker-style pieces, cozy chunky knit wool throws, hygge candle clusters, simple linen Roman blinds",
};

const FINE_TUNE_OPTIONS = {
  wall_color:     ["White", "Warm Beige", "Sage Green", "Navy Blue", "Terracotta", "Charcoal"],
  sofa_color:     ["Light Grey", "Cream", "Forest Green", "Mustard Yellow", "Navy", "Blush Pink"],
  floor_type:     ["Light Oak", "Dark Walnut", "White Marble", "Herringbone Parquet", "Polished Concrete"],
  ceiling_design: ["Plain White", "Exposed Wooden Beams", "Coffered", "Tray Ceiling", "Painted in accent color"],
};

// Negative prompt — shared by all generation modes.
const STRUCTURE_NEGATIVE_PROMPT =
  "new window, added window, extra window, imaginary window, window where none exists, removed window, " +
  "new door, added door, extra door, imaginary door, door where none exists, removed door, " +
  "new wall opening, new archway, blocked opening, " +
  "new wall, removed wall, different room shape, different floor plan, different ceiling height, " +
  "structural change, remodeled walls, different room layout, " +
  "different architecture, extra room, different perspective, different camera angle, " +
  "fisheye, distorted perspective, warped walls, CGI, render, illustration, painting, " +
  "unrealistic lighting, fake sunlight from non-existent window";

const buildPrompt = (data) => {
  const style = data.style || "modern";
  const styleDetail = STYLE_MAP[style] || style;
  const roomType = data.room_type || "room";
  const roomFurniture = ROOM_FURNITURE_CONTEXT[data.room_type] || "";
  const vibeStr = data.vibes?.length ? ` Mood: ${data.vibes.join(", ")}.` : "";
  const palette = data.color_palette ? ` Color palette: ${data.color_palette}.` : "";

  const customParts = [];
  if (data.wall_color)          customParts.push(`Wall color: ${data.wall_color}`);
  if (data.sofa_color)          customParts.push(`Sofa/seating upholstery: ${data.sofa_color}`);
  if (data.floor_type)          customParts.push(`Flooring: ${data.floor_type}`);
  if (data.ceiling_design)      customParts.push(`Ceiling: ${data.ceiling_design}`);
  if (data.custom_note?.trim()) customParts.push(data.custom_note.trim());
  const customStr = customParts.length ? ` ${customParts.join(". ")}.` : "";
  const furnitureStr = roomFurniture ? ` Include: ${roomFurniture}.` : "";

  // Build window/door lock strings — more explicit when structure lock is on
  const winCount  = data.structure_locked ? (data.window_count  ?? 1) : null;
  const doorCount = data.structure_locked ? (data.door_count    ?? 1) : null;
  const windowStr = winCount !== null
    ? `WINDOWS: EXACTLY ${winCount} window${winCount !== 1 ? "s" : ""} — no more, no less. Copy exact positions and sizes from reference. DO NOT add or remove any window. `
    : `WINDOWS: reproduce ONLY the windows that exist in the reference photo — exact positions, exact sizes, exact number. DO NOT ADD any new windows. `;
  const doorStr = doorCount !== null
    ? `DOORS: EXACTLY ${doorCount} door${doorCount !== 1 ? "s" : ""} — no more, no less. Copy exact position from reference. DO NOT add or remove any door. `
    : `DOORS: reproduce ONLY the doors that exist in the reference photo. DO NOT ADD any new doors. `;

  if (data.room_mode === "furnish") {
    return (
      `Photorealistic interior design photograph. ` +
      `CRITICAL ARCHITECTURE LOCK — copy exact camera angle, exact perspective, exact room proportions from reference. ` +
      windowStr +
      doorStr +
      `Same ceiling height. Same wall positions. Same floor plan. Zero structural changes. ` +
      `Task: add realistic ${style}-style furniture and decor only. ${styleDetail}.${furnitureStr}` +
      ` Real purchasable furniture — crisp edges, accurate fabric/wood/metal textures, proper floor contact shadows.` +
      `${palette}${customStr}${vibeStr}` +
      ` Canon EOS R5, 24mm wide-angle lens, soft natural daylight. Photorealistic, 8K, hyperdetailed.`
    );
  }

  // Redesign mode
  return (
    `Photorealistic interior design photograph. ` +
    `CRITICAL ARCHITECTURE LOCK — copy exact camera angle, exact perspective, exact room geometry from reference. ` +
    windowStr +
    doorStr +
    `Same ceiling height. Same wall positions. Same floor plan. Zero structural changes. ` +
    `Apply ${style} interior design style to this ${roomType}: ${styleDetail}.${furnitureStr}` +
    ` Change ONLY: furniture pieces, upholstery fabrics, soft furnishings, decorative objects, paint finish, surface materials.` +
    ` Do NOT change: wall structure, window count/position, door count/position, ceiling shape, floor area, room footprint.` +
    `${palette}${customStr}${vibeStr}` +
    ` Canon EOS R5, 24mm lens, natural daylight. Hyperrealistic, 8K, magazine quality.`
  );
};

// Targeted fine-tune prompt — changes only what user asked, locks room structure completely
const buildFineTunePrompt = (data) => {
  const style = data.style || "modern";
  const roomType = data.room_type || "room";
  if (!data.wall_color && !data.sofa_color && !data.floor_type && !data.ceiling_design && !data.custom_note?.trim()) {
    return buildPrompt(data);
  }

  const winCount  = data.structure_locked ? (data.window_count  ?? 1) : null;
  const doorCount = data.structure_locked ? (data.door_count    ?? 1) : null;
  const exactCounts = winCount !== null
    ? `EXACTLY ${winCount} window${winCount !== 1 ? "s" : ""} and EXACTLY ${doorCount ?? 1} door${(doorCount ?? 1) !== 1 ? "s" : ""} — no more, no less. `
    : `Same number of windows. Same number of doors. `;

  const parts = [
    `Photorealistic interior design photograph. ` +
    `ARCHITECTURE LOCKED — identical camera angle, identical perspective, identical room proportions, ` +
    `identical window positions and sizes, identical ceiling height, identical wall positions, identical door positions, ` +
    `identical floor plan from reference image. ${exactCounts}No new openings. No removed walls.`,
    `${style} style ${roomType}.`,
  ];
  if (data.wall_color)          parts.push(`${data.wall_color} painted walls.`);
  if (data.sofa_color)          parts.push(`${data.sofa_color} sofa and seating upholstery.`);
  if (data.floor_type)          parts.push(`${data.floor_type} floor finish.`);
  if (data.ceiling_design)      parts.push(`${data.ceiling_design} ceiling.`);
  if (data.custom_note?.trim()) parts.push(data.custom_note.trim() + ".");
  parts.push("Same furniture positions. Same natural light direction. Canon EOS R5, 24mm wide lens, photorealistic, 8K.");

  return parts.join(" ");
};

function FineTuneRow({ label, presets, selected, accentColor, accentBg, accentText, onSelect, placeholder }) {
  // If selected value is one of the presets, highlight it; otherwise show it in the text input
  const isPreset   = presets.includes(selected);
  const inputValue = isPreset ? "" : (selected || "");

  return (
    <div>
      {/* Label + clear */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{label}</p>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[10px] transition-colors"
            style={{ color: accentText }}
          >
            ✕ clear
          </button>
        )}
      </div>

      {/* Preset pills — clicking sets the value; clicking the active one clears it */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(selected === opt ? null : opt)}
            className="text-[11px] px-3 py-1.5 rounded-full border transition-all"
            style={{
              borderColor: selected === opt ? accentColor : "rgba(255,255,255,0.1)",
              background:  selected === opt ? accentBg    : "rgba(255,255,255,0.03)",
              color:       selected === opt ? accentText  : "rgba(255,255,255,0.5)",
              fontWeight:  selected === opt ? 600 : 400,
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Custom free-text — stored in the same field; typing clears any preset */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => onSelect(e.target.value || null)}
        placeholder={placeholder || "or type your own…"}
        className="w-full text-xs px-3 py-2 rounded-xl text-white/70 placeholder-white/20 focus:outline-none"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = accentColor + "88"; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
      />
    </div>
  );
}

function BeforeAfterSlider({ before, after }) {
  const [pos, setPos] = useState(0); // 0 = only after visible, 100 = only before visible
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false); // show drag hint once
  const containerRef = useRef(null);

  const clamp = (v) => Math.max(0, Math.min(100, v));

  const updateFromClientX = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onMouseDown = (e) => { setDragging(true); setHinted(true); updateFromClientX(e.clientX); };
  const onMouseMove = (e) => { if (dragging) updateFromClientX(e.clientX); };
  const onMouseUp   = ()  => setDragging(false);
  const onTouchStart = (e) => { setDragging(true); setHinted(true); updateFromClientX(e.touches[0].clientX); };
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
      {/* Before label — only visible when slider is dragged right */}
      <span
        className="absolute top-3 left-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/70 pointer-events-none transition-opacity duration-300"
        style={{ opacity: pos > 10 ? 1 : 0 }}
      >
        Before
      </span>
      {/* After badge always shown */}
      <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm text-white pointer-events-none" style={{ background: "rgba(27,143,160,0.8)" }}>
        After ✦
      </span>
      {/* Drag-to-compare hint — shown until user first touches slider */}
      {!hinted && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full pointer-events-none animate-pulse"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" opacity="0.7">
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
          </svg>
          <span className="text-[10px] text-white/70 font-medium">Drag to compare</span>
        </div>
      )}
    </div>
  );
}

export default function StepGenerate({ data, update, onBack, onComplete }) {
  const navigate = useNavigate();

  const [loading,      setLoading]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [generated,    setGenerated]    = useState(data.generated_render_url || null);
  const [prevGenerated,setPrevGenerated]= useState(null); // the render BEFORE the latest fine-tune (for slider "before")
  const [designId,     setDesignId]     = useState(data.design_id || null); // auto-saved draft record
  const [prompt,       setPrompt]       = useState(buildPrompt(data));
  const [intensity,    setIntensity]    = useState(data.intensity ?? 55);
  const [feedback,     setFeedback]     = useState(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [error,        setError]        = useState(null);
  const [progress,     setProgress]     = useState(0);
  const [elapsed,      setElapsed]      = useState(0);
  const timerRef = useRef(null);
  const [copied,       setCopied]      = useState(false);
  const [watermarkedUrl, setWatermarkedUrl] = useState(null);
  const [credits,      setCredits]      = useState(null);
  const [user,         setUser]         = useState(undefined); // undefined = loading, null = not logged in
  const [checkingOut,  setCheckingOut]  = useState(false);
  const [showFineTune, setShowFineTune] = useState(false); // fine-tune modal
  const [showObjectSearch, setShowObjectSearch] = useState(false); // tap-to-search panel
  const [showShareModal, setShowShareModal] = useState(false); // share-link modal
  const [shareLink, setShareLink] = useState("");

  // Track pending fine-tune changes so we can highlight "Apply changes"
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const prevFineTuneRef = useRef(null);
  useEffect(() => {
    const key = [data.wall_color, data.sofa_color, data.floor_type, data.ceiling_design, data.custom_note].join("|");
    if (prevFineTuneRef.current === null) { prevFineTuneRef.current = key; return; }
    if (prevFineTuneRef.current !== key && generated) setHasPendingChanges(true);
    prevFineTuneRef.current = key;
  }, [data.wall_color, data.sofa_color, data.floor_type, data.ceiling_design, data.custom_note]);

  // Save wizard state to localStorage before redirecting to login, so it can be restored after
  const saveAndRedirectToLogin = () => {
    try {
      localStorage.setItem("ambient_studio_draft", JSON.stringify({ ...data, _step: 3 }));
    } catch {}
    apiClient.auth.redirectToLogin(window.location.href);
  };

  useEffect(() => { setPrompt(buildPrompt(data)); }, [data.style, data.color_palette, data.vibes, data.room_mode, data.room_type, data.wall_color, data.sofa_color, data.floor_type, data.ceiling_design, data.custom_note]);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const currentUser = await apiClient.auth.me();
        setUser(currentUser);
        const userCredits = await apiClient.entities.UserCredits.filter({ user_email: currentUser.email });
        // The signup trigger always creates a user_credits row server-side; we
        // trust it here. RLS prevents client-side INSERT to user_credits, so
        // we don't try to create one if missing — the server-side /api/generate
        // route will heal a missing row on first call.
        if (userCredits.length > 0) {
          setCredits(userCredits[0]);
        }
      } catch (err) {
        console.error('Failed to fetch credits:', err);
        setUser(null);
      }
    };
    fetchCredits();

    // Refresh credits when returning from payment
    const handleFocus = () => fetchCredits();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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

  const handleBuyCredits = async () => {
    if (!user) return;
    // Save current wizard state so it survives the Pricing page visit and Stripe redirect
    try {
      localStorage.setItem("ambient_studio_session", JSON.stringify({ ...data, _step: 3 }));
    } catch {}
    navigate(createPageUrl("Pricing"));
  };

  const generate = async (isFineTune = false) => {
    if (!data.room_image_url) {
      setError("Please go back and upload a room photo first.");
      return;
    }

    const creditsNeeded = isFineTune ? 1 : 2;
    if (!credits || credits.credits_remaining < creditsNeeded) {
      setError(isFineTune
        ? "You need at least 1 credit to fine-tune. Purchase more to continue."
        : "You need at least 2 credits to generate a design. Purchase more to continue."
      );
      return;
    }

    setError(null);
    setLoading(true);
    setFeedback(null);
    setFeedbackNote("");
    setElapsed(0);
    setProgress(0);
    // Start elapsed-time counter so user sees live feedback
    clearInterval(timerRef.current);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(secs);
      // Simulate progress: accelerate to 85% in ~25s then stall until done
      setProgress(Math.min(85, Math.round((secs / 30) * 85)));
    }, 1000);

    let refinedPrompt;
    let strength;

    // For fine-tune: snapshot the current render as "before", use it as the SD base image
    const baseImageUrl = (isFineTune && generated) ? generated : data.room_image_url;
    if (isFineTune && generated) setPrevGenerated(generated);

    if (isFineTune) {
      refinedPrompt = buildFineTunePrompt(data);
      strength = 0.22; // very low — only colors/materials change; structure frozen
    } else {
      refinedPrompt =
        feedback === "dislike" && feedbackNote
          ? `${prompt}, avoid: ${feedbackNote}`
          : prompt;
      if (data.room_mode === "furnish") {
        // Furnish: placing furniture into an empty room — needs moderate-high strength.
        // Map intensity 0–100 → strength 0.55–0.78; tighten slightly when locked.
        const furnishBase = 0.55 + (intensity / 100) * 0.23;
        strength = data.structure_locked
          ? Math.min(furnishBase, 0.68)
          : Math.min(furnishBase, 0.78);
      } else {
        // Redesign: change style/materials ONLY — structure must stay intact.
        // Map intensity 0–100 → strength 0.15–0.38 so the model never wanders far
        // from the original composition. Higher intensity = bolder style, not new walls.
        const redesignBase = 0.15 + (intensity / 100) * 0.23;
        strength = data.structure_locked
          ? Math.min(redesignBase, 0.28)   // locked: max 0.28 — very tight to original
          : Math.min(redesignBase, 0.38);  // unlocked: max 0.38
      }
    }

    const isPaid = credits && credits.plan_type !== "free";

    // Strengthen negative prompt when structure lock is on
    const LOCKED_EXTRA =
      ", extra window, missing window, repositioned window, moved window, " +
      "extra door, missing door, repositioned door, moved door, " +
      "changed camera angle, rotated view, different viewpoint, zoomed in, zoomed out, " +
      "wide angle distortion, perspective shift";
    const activeNegativePrompt = data.structure_locked
      ? STRUCTURE_NEGATIVE_PROMPT + LOCKED_EXTRA
      : STRUCTURE_NEGATIVE_PROMPT;

    try {
      const result = await apiClient.integrations.Core.GenerateImage({
        prompt: refinedPrompt,
        existing_image_urls: [baseImageUrl],
        // Pass the room mode so the server can pick the right strength range:
        // 'furnish' = empty room → high strength (add furniture)
        // 'redesign' = furnished room → mid strength (change style, keep structure)
        mode: data.room_mode || 'redesign',
        design_id: designId,
        options: {
          strength,
          guidance_scale: data.structure_locked ? (isPaid ? 16 : 12) : (isPaid ? 13 : 9),
          num_inference_steps: isPaid ? 40 : 18,
          negative_prompt: activeNegativePrompt,
          ...(isPaid ? { width: 1024, height: 1024 } : { width: 768, height: 768 }),
        },
      });

      const url = result?.url || result;
      if (!url) throw new Error("No image returned. Please try again.");

      // Server (/api/generate) already debited the credit transactionally
      // and returns the new balance. Trust it instead of writing from the
      // client (which RLS blocks anyway).
      const newBalance =
        typeof result?.credits_remaining === 'number'
          ? result.credits_remaining
          : Math.max(0, credits.credits_remaining - creditsNeeded);
      setCredits({ ...credits, credits_remaining: newBalance });

      clearInterval(timerRef.current);
      setProgress(100);
      setGenerated(url);
      setWatermarkedUrl(null); // reset; will be re-applied by effect below
      setHasPendingChanges(false);
      prevFineTuneRef.current = [data.wall_color, data.sofa_color, data.floor_type, data.ceiling_design, data.custom_note].join("|");
      update({ generated_render_url: url, generation_prompt: refinedPrompt, intensity });

      // ── Auto-save draft so the design is never lost ──────────────────────
      // If we already have a draft record from a previous generation, update it.
      // Otherwise create a new draft. Status stays "draft" until user clicks Save & Shop.
      const designPayload = {
        name:                 data.name || "My Room Design",
        style:                data.style,
        room_type:            data.room_type,
        color_palette:        data.color_palette,
        vibes:                data.vibes,
        budget_min:           data.budget_min,
        budget_max:           data.budget_max,
        budget_tier:          data.budget_tier,
        sustainability_mode:  data.sustainability_mode,
        room_image_url:       data.room_image_url,
        room_file_url:        data.room_file_url,
        room_dimensions:      data.room_dimensions,
        generated_render_url: url,
        generation_prompt:    refinedPrompt,
        intensity,
        status: "draft",
      };
      try {
        if (isFineTune) {
          // Each fine-tune iteration = a new record in My Designs so user sees full history
          const record = await apiClient.entities.RoomDesign.create({
            ...designPayload,
            // Keep original upload as room_image_url so before/after always makes sense
            room_image_url: data.room_image_url,
          });
          setDesignId(record.id);
          update({ design_id: record.id });
        } else if (designId) {
          // Full re-generation: update existing draft (same design, new render)
          await apiClient.entities.RoomDesign.update(designId, designPayload);
        } else {
          // First-ever generation: create fresh draft
          const record = await apiClient.entities.RoomDesign.create(designPayload);
          setDesignId(record.id);
          update({ design_id: record.id });
        }
      } catch {
        // Auto-save failure is silent — user can still manually Save & Shop
      }
    } catch (err) {
      clearInterval(timerRef.current);
      const raw = err?.message || "";
      // If the LLM intercepted the prompt and returned a text response, show a friendly error
      const isLlmResponse = raw.toLowerCase().startsWith("sure") || raw.toLowerCase().startsWith("here") || raw.length > 120;
      setError(isLlmResponse
        ? "Image generation failed. Please try a different style or simpler description and try again."
        : raw || "Generation failed. Please try again."
      );
    } finally {
      clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleSaveAndShop = async () => {
    if (!generated) return;
    setSaving(true);
    setError(null);
    let navigated = false;
    try {
      let id = designId;
      if (id) {
        // Upgrade the existing draft to "ready" so product matching becomes available
        await apiClient.entities.RoomDesign.update(id, { status: "ready", generated_render_url: generated });
      } else {
        // Fallback: no draft yet (shouldn't normally happen), create fresh
        const record = await apiClient.entities.RoomDesign.create({
          name:                 data.name || "My Room Design",
          style:                data.style,
          room_type:            data.room_type,
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
        id = record.id;
      }
      navigate(createPageUrl(`Design`) + `?id=${id}`);
      navigated = true;
    } catch (err) {
      // Surface the real error to the console so we can diagnose schema /
      // RLS / network issues quickly. The user-facing message stays generic.
      // eslint-disable-next-line no-console
      console.error("[handleSaveAndShop] save failed:", err);
      const detail =
        err?.message || err?.details || err?.hint || "";
      setError(
        detail
          ? `Couldn't save: ${String(detail).slice(0, 160)}`
          : "Couldn't save. Please try again."
      );
    } finally {
      // Always reset the spinner unless we successfully kicked off navigation
      // (in which case the page is unmounting). Without this finally, a hung
      // request leaves the button stuck on "Saving..." indefinitely.
      if (!navigated) setSaving(false);
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

  const handleShare = () => {
    const url = designId
      ? `${window.location.origin}/Design?id=${designId}`
      : window.location.origin;
    setShareLink(url);
    setShowShareModal(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPaidUser = credits && credits.plan_type !== "free";

  // Burn watermark into image for free users
  useEffect(() => {
    if (!generated || isPaidUser) { setWatermarkedUrl(null); return; }
    applyWatermarkToImage(generated).then(setWatermarkedUrl);
  }, [generated, isPaidUser]);

  const intensityLabel =
    intensity < 30 ? "Subtle style refresh"
    : intensity < 55 ? "Balanced redesign"
    : intensity < 75 ? "Bold style change"
    : "Max style — may shift structure";

  // Still loading auth
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#1B8FA0" }} />
      </div>
    );
  }

  // Not logged in — show login wall
  if (user === null) {
    return (
      <div className="flex flex-col items-center text-center gap-5 py-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}>
          <Layers className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Sign in to generate</h2>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            Create a free account to get your first AI design free. Buy credits to continue designing.
          </p>
        </div>
        <button
          onClick={saveAndRedirectToLogin}
          className="flex items-center gap-2 font-semibold px-8 py-4 rounded-2xl transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", color: "#0A0A12" }}
        >
          <LogIn className="w-4 h-4" />
          Sign in — it's free
        </button>
        <button
          onClick={onBack}
          className="text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">
        {data.room_mode === "furnish" ? "Furnish your empty room" : "Generate your design"}
      </h2>
        {credits && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "rgba(27,143,160,0.1)", border: "1px solid rgba(27,143,160,0.25)" }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: "#1B8FA0" }} />
            <span className="text-sm font-semibold" style={{ color: "#1B8FA0" }}>
              {credits.credits_remaining} {credits.credits_remaining === 1 ? 'credit' : 'credits'}
            </span>
          </div>
        )}
      </div>
      <p className="text-white/40 text-sm mb-6">
        {data.room_mode === "furnish"
          ? <>AI will place realistic <strong className="text-white/70">{data.style}</strong>-style furniture into your empty room — keeping your walls, windows and perspective.</>
          : <>Stable Diffusion will redesign your room in the <strong className="text-white/70">{data.style}</strong> style, keeping your room structure intact.</>
        }{" "}Full generation uses 2 credits. Fine-tuning uses 1 credit.
      </p>

      {/* ── Custom specifications ─────────────────────────────── */}
      <div className="mb-6 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(27,143,160,0.2)" }}>
            <Sliders className="w-3.5 h-3.5" style={{ color: "#6EC6C6" }} />
          </div>
          <p className="text-sm font-semibold text-white">Custom specifications</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto" style={{ background: "rgba(27,143,160,0.12)", color: "#6EC6C6", border: "1px solid rgba(27,143,160,0.2)" }}>Optional</span>
        </div>
        <textarea
          rows={3}
          value={data.custom_note || ""}
          onChange={(e) => update({ custom_note: e.target.value })}
          disabled={loading}
          placeholder="Describe anything specific you want in your design…&#10;e.g. add a single bed, include a fireplace, add a large plant by the window, keep the existing sofa"
          className="w-full text-sm px-4 py-3 rounded-xl text-white/80 placeholder-white/20 focus:outline-none resize-none disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", lineHeight: "1.5" }}
          onFocus={(e)  => { e.currentTarget.style.borderColor = "rgba(27,143,160,0.4)"; }}
          onBlur={(e)   => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
        {data.custom_note?.trim() && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-white/30">This will be included in your generation</p>
            <button
              type="button"
              onClick={() => update({ custom_note: "" })}
              className="text-[11px] transition-colors"
              style={{ color: "#6EC6C6" }}
            >
              ✕ clear
            </button>
          </div>
        )}
      </div>

      {/* ── Structure Lock ─────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${data.structure_locked ? "rgba(27,143,160,0.35)" : "rgba(255,255,255,0.08)"}` }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: data.structure_locked ? "rgba(27,143,160,0.25)" : "rgba(255,255,255,0.06)" }}>
            <Lock className="w-3.5 h-3.5" style={{ color: data.structure_locked ? "#6EC6C6" : "rgba(255,255,255,0.4)" }} />
          </div>
          <p className="text-sm font-semibold text-white">Structure Lock</p>
          {/* Toggle */}
          <button
            type="button"
            disabled={loading}
            onClick={() => update({ structure_locked: !data.structure_locked })}
            className="ml-auto w-10 h-5 rounded-full relative transition-all focus:outline-none disabled:opacity-40"
            style={{ background: data.structure_locked ? "#1B8FA0" : "rgba(255,255,255,0.12)" }}
            aria-label="Toggle structure lock"
          >
            <span
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: data.structure_locked ? "calc(100% - 18px)" : "2px" }}
            />
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
          Prevents the AI from adding, removing or repositioning windows, doors and changing the camera angle.
        </p>

        {data.structure_locked && (
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
              Tell the AI exactly how many exist in your photo
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Windows */}
              <div className="rounded-xl p-3" style={{ background: "rgba(27,143,160,0.07)", border: "1px solid rgba(27,143,160,0.18)" }}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: "#6EC6C6" }}>🪟 Windows</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => update({ window_count: Math.max(0, (data.window_count ?? 1) - 1) })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold transition-all disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >−</button>
                  <span className="text-white font-bold w-6 text-center tabular-nums">{data.window_count ?? 1}</span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => update({ window_count: Math.min(10, (data.window_count ?? 1) + 1) })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold transition-all disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >+</button>
                </div>
              </div>
              {/* Doors */}
              <div className="rounded-xl p-3" style={{ background: "rgba(27,143,160,0.07)", border: "1px solid rgba(27,143,160,0.18)" }}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: "#6EC6C6" }}>🚪 Doors</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => update({ door_count: Math.max(0, (data.door_count ?? 1) - 1) })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold transition-all disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >−</button>
                  <span className="text-white font-bold w-6 text-center tabular-nums">{data.door_count ?? 1}</span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => update({ door_count: Math.min(5, (data.door_count ?? 1) + 1) })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold transition-all disabled:opacity-40"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                  >+</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Intensity slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/40">Transformation intensity</label>
          <span className="text-xs font-semibold" style={{ color: "#1B8FA0" }}>{intensityLabel}</span>
        </div>
        <input
          type="range"
          min={20}
          max={80}
          value={intensity}
          onChange={(e) => setIntensity(parseInt(e.target.value))}
          disabled={loading}
          className="w-full disabled:opacity-40" style={{ accentColor: "#1B8FA0" }}
        />
        <div className="flex justify-between text-[10px] text-white/25 mt-1">
          <span>Keep original character</span>
          <span>Bold transformation</span>
        </div>
        {intensity > 65 && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)", color: "rgba(201,150,58,0.8)" }}>
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>High intensity may alter room structure. If windows or doors change, lower the slider and regenerate.</span>
          </div>
        )}
      </div>

      {/* Preview area */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 mb-6 min-h-[220px] flex items-center justify-center bg-white/3">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#1B8FA0" }} />
            <p className="text-white/60 text-sm font-medium">
              {elapsed < 5 ? "Starting AI engine…" : elapsed < 15 ? "Rendering your design…" : elapsed < 25 ? "Almost there…" : "Finalising details…"}
            </p>
            <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, #1B8FA0, #C9963A)" }}
              />
            </div>
            <p className="text-white/30 text-xs tabular-nums">{elapsed}s — usually 25–40s</p>
          </div>
        ) : generated ? (
          <div
            className="relative w-full"
            onContextMenu={(e) => e.preventDefault()}
          >
            <BeforeAfterSlider
              before={prevGenerated || data.room_image_url}
              after={generated}
            />

            {/* Transparent full-coverage shield for free users —
                sits above the slider images, blocks right-click / drag save.
                Does NOT block slider drag because the slider's own
                mouse/touch handlers are on the BeforeAfterSlider container
                which is a sibling layer handled at the DOM event level.    */}
            {!isPaidUser && (
              <div
                className="absolute inset-0"
                style={{ zIndex: 9, background: "transparent" }}
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              />
            )}

            {/* ── Watermark pill — free tier only ─────────────────── */}
            {!isPaidUser && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ zIndex: 10 }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full select-none"
                  style={{
                    background: "rgba(10,10,11,0.70)",
                    border: "1px solid rgba(27,143,160,0.50)",
                    backdropFilter: "blur(6px)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
                  }}
                >
                  <span style={{ color: "#1B8FA0", fontSize: 15, lineHeight: 1 }}>✦</span>
                  <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                    Designed by Ambient Space
                  </span>
                </div>
              </div>
            )}

            {/* Tap-to-search button — top-left corner of image */}
            <button
              onClick={() => setShowObjectSearch(true)}
              className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 backdrop-blur-sm"
              style={{ background: "rgba(10,10,11,0.7)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", zIndex: 11 }}
              title="Search furniture items"
            >
              <Search className="w-3 h-3" />
              Find items
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(27,143,160,0.1)", border: "1px solid rgba(27,143,160,0.25)" }}>
              <Sparkles className="w-7 h-7" style={{ color: "#1B8FA0" }} />
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
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-xs font-semibold text-white/40 tracking-wide uppercase">Rate this result</p>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <button
              onClick={() => setFeedback(feedback === "like" ? null : "like")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                feedback === "like"
                  ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                  : "bg-white/4 border border-white/8 text-white/45 hover:text-white/70 hover:border-white/15"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Looks great
            </button>
            <button
              onClick={() => setFeedback(feedback === "dislike" ? null : "dislike")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                feedback === "dislike"
                  ? "bg-red-500/12 border border-red-500/35 text-red-400"
                  : "bg-white/4 border border-white/8 text-white/45 hover:text-white/70 hover:border-white/15"
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" /> Needs work
            </button>
          </div>
          {feedback === "dislike" && (
            <div className="px-5 pb-4">
              <input
                type="text"
                placeholder="What would you change? e.g. too dark, more plants, lighter colors"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="w-full text-sm px-4 py-3 rounded-xl text-white/70 placeholder-white/20 focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(27,143,160,0.4)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
              <p className="text-white/25 text-xs mt-2">Tap Regenerate below to apply your feedback</p>
            </div>
          )}
        </div>
      )}

      {/* Fine-Tune compact centered modal */}
      <AnimatePresence>
        {showFineTune && (
          <>
            {/* Full-screen overlay — catches clicks outside the dialog */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
              onClick={() => setShowFineTune(false)}
            >
              {/* Dialog — stops clicks propagating to backdrop */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-3xl flex flex-col"
                style={{
                  background: "#16181A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                  maxWidth: 520,
                  height: "min(88vh, 680px)",
                  overflow: "hidden",
                }}
              >
                {/* Sticky header */}
                <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/8">
                  <div>
                    <p className="text-sm font-bold text-white">Fine-Tune Your Design</p>
                    <p className="text-[11px] text-white/35 mt-0.5">Room structure stays fixed — only selected elements change</p>
                  </div>
                  <button
                    onClick={() => setShowFineTune(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/8 transition-all flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5" style={{ WebkitOverflowScrolling: "touch" }}>

                  {/* Four category rows */}
                  <div className="space-y-5">
                    <FineTuneRow
                      label="Wall Colour" presets={FINE_TUNE_OPTIONS.wall_color} selected={data.wall_color}
                      accentColor="#1B8FA0" accentBg="rgba(27,143,160,0.18)" accentText="#6EC6C6"
                      placeholder="e.g. dusty blue, sage green, warm beige…"
                      onSelect={(v) => update({ wall_color: v })} />
                    <FineTuneRow
                      label="Sofa / Seating" presets={FINE_TUNE_OPTIONS.sofa_color} selected={data.sofa_color}
                      accentColor="#7c3aed" accentBg="rgba(124,58,237,0.18)" accentText="#a78bfa"
                      placeholder="e.g. deep teal velvet, cognac leather…"
                      onSelect={(v) => update({ sofa_color: v })} />
                    <FineTuneRow
                      label="Flooring" presets={FINE_TUNE_OPTIONS.floor_type} selected={data.floor_type}
                      accentColor="#C9963A" accentBg="rgba(201,150,58,0.18)" accentText="#C9963A"
                      placeholder="e.g. cream travertine, brushed concrete…"
                      onSelect={(v) => update({ floor_type: v })} />
                    <FineTuneRow
                      label="Ceiling" presets={FINE_TUNE_OPTIONS.ceiling_design} selected={data.ceiling_design}
                      accentColor="#D4A0A0" accentBg="rgba(212,160,160,0.18)" accentText="#D4A0A0"
                      placeholder="e.g. arch vaulted, plaster molding…"
                      onSelect={(v) => update({ ceiling_design: v })} />
                  </div>

                  {/* Active selections summary */}
                  {(data.wall_color || data.sofa_color || data.floor_type || data.ceiling_design) && (
                    <div className="flex flex-wrap gap-1.5 px-3 py-2.5 rounded-2xl" style={{ background: "rgba(27,143,160,0.06)", border: "1px solid rgba(27,143,160,0.15)" }}>
                      <span className="text-[10px] text-white/30 self-center mr-1">Changing:</span>
                      {data.wall_color     && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(27,143,160,0.2)",   color: "#6EC6C6" }}>Walls: {data.wall_color}</span>}
                      {data.sofa_color     && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(124,58,237,0.2)",  color: "#a78bfa" }}>Sofa: {data.sofa_color}</span>}
                      {data.floor_type     && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(201,150,58,0.2)",  color: "#C9963A" }}>Floor: {data.floor_type}</span>}
                      {data.ceiling_design && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(212,160,160,0.2)", color: "#D4A0A0" }}>Ceiling: {data.ceiling_design}</span>}
                    </div>
                  )}

                  {/* Custom free-text note */}
                  <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Anything else?</p>
                    <textarea
                      rows={3}
                      value={data.custom_note || ""}
                      onChange={(e) => update({ custom_note: e.target.value })}
                      placeholder="e.g. add more plants, warmer lighting, include a fireplace, darker curtains…"
                      className="w-full text-sm px-3 py-2.5 rounded-xl text-white/70 placeholder-white/20 focus:outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={(e)  => { e.currentTarget.style.borderColor = "rgba(27,143,160,0.4)"; }}
                      onBlur={(e)   => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                  </div>
                </div>

                {/* Sticky footer — always visible */}
                <div className="flex-shrink-0 flex gap-2.5 px-5 pb-5 pt-3 border-t border-white/8">
                  <button
                    onClick={() => setShowFineTune(false)}
                    className="px-4 py-3 rounded-xl text-sm font-medium transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { setShowFineTune(false); generate(true); }}
                    disabled={loading || !credits || credits.credits_remaining < 1}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", color: "white" }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Apply changes — 1 credit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Object Search Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showObjectSearch && generated && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
              onClick={() => setShowObjectSearch(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-3xl overflow-hidden"
              style={{ background: "#16181A", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)", maxWidth: 500, margin: "0 auto", maxHeight: "80vh", overflowY: "auto" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Search className="w-4 h-4" style={{ color: "#C9963A" }} />
                    Find Furniture & Decor
                  </p>
                  <p className="text-[11px] text-white/35 mt-0.5">Search items from this design on Amazon or Google</p>
                </div>
                <button onClick={() => setShowObjectSearch(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 hover:text-white hover:bg-white/8 transition-all flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* Google Lens — search full image */}
                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2.5">Search entire room</p>
                  <a
                    href={`https://www.google.com/searchbyimage?image_url=${encodeURIComponent(generated)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 active:opacity-60"
                    style={{ background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.25)", color: "#7EB1F8" }}
                  >
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">Google Image Search</div>
                      <div className="text-[11px] text-white/35 font-normal">Find similar items from the full room image</div>
                    </div>
                  </a>
                </div>

                {/* Amazon chips — per furniture item from the room context */}
                {ROOM_FURNITURE_CONTEXT[data.room_type] && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <ShoppingBag className="w-3 h-3" style={{ color: "#C9963A" }} />
                      Shop by item — Amazon.de
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ROOM_FURNITURE_CONTEXT[data.room_type].split(",").map((item) => {
                        const clean = item.trim().replace(/ or .+$/, "").replace(/ with .+$/, "").replace(/ and .+$/, "").replace(/^\d+[-–] /, "").trim();
                        if (!clean) return null;
                        const query = `${clean} ${data.style || ""} ${data.room_type || ""}`.trim();
                        const url = `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${AMAZON_TAG}`;
                        return (
                          <a
                            key={clean}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all hover:opacity-90 active:opacity-60"
                            style={{ borderColor: "rgba(201,150,58,0.3)", background: "rgba(201,150,58,0.08)", color: "rgba(201,150,58,0.9)" }}
                          >
                            <ShoppingBag className="w-2.5 h-2.5 flex-shrink-0" />
                            {clean}
                          </a>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-white/20 mt-3">Tap any item to search Amazon. Links may include an affiliate commission — helps keep Ambient free.</p>
                  </div>
                )}

                {/* Amazon general search */}
                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Custom search</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = e.target.elements.q.value.trim();
                      if (!val) return;
                      window.open(`https://www.amazon.com/s?k=${encodeURIComponent(val)}&tag=${AMAZON_TAG}`, "_blank");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      name="q"
                      type="text"
                      placeholder={`e.g. ${data.style || "modern"} sofa, oak coffee table…`}
                      className="flex-1 text-sm px-3 py-2.5 rounded-xl text-white/70 placeholder-white/20 focus:outline-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(201,150,58,0.4)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                      style={{ background: "rgba(201,150,58,0.15)", border: "1px solid rgba(201,150,58,0.3)", color: "#C9963A" }}
                    >
                      Search
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Share Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-3xl p-8 shadow-2xl"
              style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}>
                <Share2 className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-center">Share Your Design</h2>
              <p className="text-white/40 text-sm text-center mb-6">
                Anyone with this link can view your room design — no login required.
              </p>
              <div className="rounded-2xl p-4 mb-6 border border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-transparent text-white/70 text-sm outline-none min-w-0 truncate"
                  />
                  <button
                    onClick={copyShareLink}
                    className="flex-shrink-0 flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ background: "#1B8FA0" }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full border text-white/70 px-6 py-3 rounded-2xl font-medium transition-all hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action Buttons ───────────────────────────────────────── */}
      <div className="space-y-2.5">

        {/* Row 1 — PRIMARY: Generate / Regenerate (always visible) */}
        {!credits ? (
          <button disabled className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold opacity-50 cursor-not-allowed"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </button>
        ) : credits.credits_remaining < 2 ? (
          <button onClick={handleBuyCredits}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}>
            <CreditCard className="w-4 h-4" /> Get More Credits to Generate
          </button>
        ) : (
          <button onClick={generate} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold transition-all disabled:opacity-50"
            style={{ background: loading ? "rgba(27,143,160,0.12)" : generated ? "rgba(27,143,160,0.15)" : "linear-gradient(135deg, #1B8FA0, #C9963A)",
              border: generated ? "1px solid rgba(27,143,160,0.4)" : "none",
              color: generated ? "#6EC6C6" : "white",
              boxShadow: !generated && !loading ? "0 8px 32px rgba(27,143,160,0.35)" : "none" }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : generated ? <><RefreshCw className="w-4 h-4" /> Regenerate</>
              : <><Sparkles className="w-4 h-4" /> Generate Design</>}
          </button>
        )}

        {/* Row 2 — SECONDARY: Save & Shop + Fine-Tune (shown after generation) */}
        {generated && !loading && (
          <div className="flex gap-2.5">
            <button onClick={handleSaveAndShop} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", boxShadow: "0 4px 20px rgba(27,143,160,0.3)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
              {saving ? "Saving…" : "Save & Shop"}
            </button>
            <button onClick={() => setShowFineTune(true)}
              className="relative flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: hasPendingChanges ? "rgba(27,143,160,0.18)" : "rgba(255,255,255,0.06)",
                border: hasPendingChanges ? "1px solid rgba(27,143,160,0.45)" : "1px solid rgba(255,255,255,0.1)",
                color: hasPendingChanges ? "#6EC6C6" : "rgba(255,255,255,0.55)" }}>
              <Sliders className="w-4 h-4" />
              Fine-Tune
              {hasPendingChanges && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-[#0A0A0B]" />}
            </button>
          </div>
        )}

        {/* Row 3 — UTILITY: Back + Download + Share (small, quiet) */}
        <div className="flex items-center gap-2">
          <button onClick={onBack} disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>
            ← Back
          </button>
          {generated && !loading && (
            <>
              {isPaidUser ? (
                <button onClick={handleDownload} title="Download HD"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all hover:bg-white/8"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              ) : (
                <button onClick={() => navigate(createPageUrl("Pricing"))} title="Upgrade to download"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: "rgba(201,150,58,0.08)", border: "1px solid rgba(201,150,58,0.2)", color: "rgba(201,150,58,0.6)" }}>
                  <Lock className="w-3.5 h-3.5" /> Download
                </button>
              )}
              <button onClick={handleShare} title="Share link"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all hover:bg-white/8"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}