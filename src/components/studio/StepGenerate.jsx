import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, ThumbsUp, ThumbsDown, BookmarkCheck, Download, Share2, CreditCard, LogIn, Layers, Lock, Globe, Sliders, X } from "lucide-react";

function ImageWatermark() {
  return (
    <div
      className="absolute inset-y-0 right-0 flex items-center justify-center pointer-events-none select-none"
      style={{ width: 28 }}
    >
      <span
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          transform: "rotate(180deg)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.45)",
          textShadow: "0 1px 4px rgba(0,0,0,0.6)",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        ✦ ambientspace.ai
      </span>
    </div>
  );
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

const buildPrompt = (data) => {
  const style = data.style || "modern";
  const styleDetail = STYLE_MAP[style] || style;
  const roomType = data.room_type || "room";
  const roomFurniture = ROOM_FURNITURE_CONTEXT[data.room_type] || "";
  const vibeStr = data.vibes?.length ? ` Mood: ${data.vibes.join(", ")}.` : "";
  const palette = data.color_palette ? ` Color palette: ${data.color_palette}.` : "";

  const customParts = [];
  if (data.wall_color)      customParts.push(`Wall color: ${data.wall_color}`);
  if (data.sofa_color)      customParts.push(`Sofa/seating upholstery: ${data.sofa_color}`);
  if (data.floor_type)      customParts.push(`Flooring: ${data.floor_type}`);
  if (data.ceiling_design)  customParts.push(`Ceiling: ${data.ceiling_design}`);
  if (data.custom_note?.trim()) customParts.push(data.custom_note.trim());
  const customStr = customParts.length ? ` ${customParts.join(". ")}.` : "";
  const furnitureStr = roomFurniture ? ` This is a ${roomType} — include: ${roomFurniture}.` : "";

  if (data.room_mode === "furnish") {
    return (
      `Photorealistic interior design photograph of a fully furnished ${roomType}.` +
      ` CRITICAL: Preserve the EXACT same camera angle, perspective, window positions, room proportions, wall surfaces, and natural lighting from the reference empty room photo. Do NOT alter the architecture.` +
      ` Fill the room with realistic furniture and decor in ${style} interior design style: ${styleDetail}.${furnitureStr}` +
      ` Every furniture piece must look like a real purchasable product — crisp edges, realistic fabric/wood/metal textures, accurate proportions, proper contact shadows on the floor.` +
      `${palette}${customStr}${vibeStr}` +
      ` Shot on Canon EOS R5, 24mm wide-angle lens, soft natural daylight through windows, HDR.` +
      ` 8K resolution, photorealistic, hyperdetailed. NO floating objects. NO blurry textures. NO unrealistic proportions. NO CGI glow. NO AI artifacts.`
    );
  }

  // Default: redesign mode
  return (
    `Photorealistic interior design photograph of a ${roomType}.` +
    ` Keep the EXACT same room structure as the reference: same walls, windows, doors, floor layout, ceiling height, room dimensions, camera angle, and perspective. Do NOT change any architecture.` +
    ` Only replace: furniture style, upholstery, colors, materials, and decorative accessories.` +
    ` Apply ${style} interior design style: ${styleDetail}.${furnitureStr}` +
    `${palette}${customStr}${vibeStr}` +
    ` Shot on Canon EOS R5, 24mm lens, natural daylight, professional interior photography.` +
    ` Hyperrealistic, 8K resolution, magazine quality. NO AI artifacts. NO distortion. NO structural changes to the room.`
  );
};

// Targeted fine-tune prompt — only describes what to change, locks everything else
const buildFineTunePrompt = (data) => {
  const style = data.style || "modern";
  const roomType = data.room_type || "room";
  if (!data.wall_color && !data.sofa_color && !data.floor_type && !data.ceiling_design && !data.custom_note?.trim()) {
    return buildPrompt(data);
  }

  // Build a pure Stable Diffusion descriptive prompt — NO instruction/chat language.
  // The low strength parameter handles preservation; the prompt just describes the desired result.
  const parts = [
    `Photorealistic interior design photograph of a ${roomType}, ${style} style.`,
  ];
  if (data.wall_color)     parts.push(`${data.wall_color} walls.`);
  if (data.sofa_color)     parts.push(`${data.sofa_color} sofa and seating.`);
  if (data.floor_type)     parts.push(`${data.floor_type} flooring.`);
  if (data.ceiling_design) parts.push(`${data.ceiling_design} ceiling.`);
  if (data.custom_note?.trim()) parts.push(data.custom_note.trim() + ".");
  parts.push("Same furniture layout, same room proportions, same camera angle as reference.");
  parts.push("Shot on Canon EOS R5, 24mm lens, natural daylight. Photorealistic, 8K, magazine quality.");

  return parts.join(" ");
};

function FineTuneRow({ label, presets, selected, accentColor, accentBg, accentText, onSelect, placeholder }) {
  const [custom, setCustom] = useState("");

  const handlePreset = (opt) => {
    const next = selected === opt ? null : opt;
    onSelect(next);
    if (next) setCustom(""); // clear custom text when a preset is picked
  };

  const handleCustomChange = (e) => {
    setCustom(e.target.value);
    onSelect(e.target.value || null); // propagate free text as the selection
  };

  return (
    <div>
      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => handlePreset(opt)}
            className="text-[11px] px-3 py-1 rounded-full border transition-all"
            style={{
              borderColor: selected === opt ? accentColor : "rgba(255,255,255,0.1)",
              background: selected === opt ? accentBg : "transparent",
              color: selected === opt ? accentText : "rgba(255,255,255,0.45)",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={custom}
        onChange={handleCustomChange}
        placeholder={placeholder}
        className="w-full text-xs px-3 py-2 rounded-xl text-white/60 placeholder-white/20 focus:outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = `${accentColor}55`; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
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
  const [intensity,    setIntensity]    = useState(data.intensity ?? 65);
  const [feedback,     setFeedback]     = useState(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [error,        setError]        = useState(null);
  const [progress,     setProgress]     = useState(0);
  const [elapsed,      setElapsed]      = useState(0);
  const timerRef = useRef(null);
  const [copied,       setCopied]       = useState(false);
  const [credits,      setCredits]      = useState(null);
  const [user,         setUser]         = useState(undefined); // undefined = loading, null = not logged in
  const [checkingOut,  setCheckingOut]  = useState(false);
  const [showFineTune, setShowFineTune] = useState(false); // fine-tune bottom sheet

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
    base44.auth.redirectToLogin(window.location.href);
  };

  useEffect(() => { setPrompt(buildPrompt(data)); }, [data.style, data.color_palette, data.vibes, data.room_mode, data.room_type, data.wall_color, data.sofa_color, data.floor_type, data.ceiling_design, data.custom_note]);

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
            credits_remaining: 2,
            plan_type: "free",
            total_purchased: 0,
          });
          setCredits(newCredits);
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
      // Targeted edit: use preservation prompt + very low strength so only the requested element changes
      refinedPrompt = buildFineTunePrompt(data);
      strength = 0.28; // low enough to preserve furniture, high enough to change wall/floor/sofa color
    } else {
      refinedPrompt =
        feedback === "dislike" && feedbackNote
          ? `${prompt}, avoid: ${feedbackNote}`
          : prompt;
      // Furnish mode needs higher minimum strength to actually place furniture
      strength = data.room_mode === "furnish"
        ? Math.max(intensity / 100, 0.75)
        : intensity / 100;
    }

    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: refinedPrompt,
        existing_image_urls: [baseImageUrl],  // fine-tune starts from latest render, not original upload
        options: { strength, guidance_scale: 7.5, num_inference_steps: 25 },
      });

      const url = result?.url || result;
      if (!url) throw new Error("No image returned. Please try again.");

      await base44.entities.UserCredits.update(credits.id, {
        credits_remaining: credits.credits_remaining - creditsNeeded,
      });
      setCredits({ ...credits, credits_remaining: credits.credits_remaining - creditsNeeded });

      clearInterval(timerRef.current);
      setProgress(100);
      setGenerated(url);
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
          const record = await base44.entities.RoomDesign.create({
            ...designPayload,
            // Keep original upload as room_image_url so before/after always makes sense
            room_image_url: data.room_image_url,
          });
          setDesignId(record.id);
          update({ design_id: record.id });
        } else if (designId) {
          // Full re-generation: update existing draft (same design, new render)
          await base44.entities.RoomDesign.update(designId, designPayload);
        } else {
          // First-ever generation: create fresh draft
          const record = await base44.entities.RoomDesign.create(designPayload);
          setDesignId(record.id);
          update({ design_id: record.id });
        }
      } catch {
        // Auto-save failure is silent — user can still manually Save & Shop
      }
    } catch (err) {
      clearInterval(timerRef.current);
      const raw = err?.message || "";
      // If Base44 LLM intercepted the prompt and returned a text response, show a friendly error
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
    try {
      let id = designId;
      if (id) {
        // Upgrade the existing draft to "ready" so product matching becomes available
        await base44.entities.RoomDesign.update(id, { status: "ready", generated_render_url: generated });
      } else {
        // Fallback: no draft yet (shouldn't normally happen), create fresh
        const record = await base44.entities.RoomDesign.create({
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

  const isPaidUser = credits && credits.plan_type !== "free";

  const intensityLabel =
    intensity < 35 ? "Subtle refresh"
    : intensity < 55 ? "Balanced redesign"
    : intensity < 75 ? "Bold transformation"
    : "Full reimagination";

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

      {/* Prompt is built internally — not shown to users */}

      {/* Intensity slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/40">Transformation intensity</label>
          <span className="text-xs font-semibold" style={{ color: "#1B8FA0" }}>{intensityLabel}</span>
        </div>
        <input
          type="range"
          min={20}
          max={90}
          value={intensity}
          onChange={(e) => setIntensity(parseInt(e.target.value))}
          disabled={loading}
          className="w-full disabled:opacity-40" style={{ accentColor: "#1B8FA0" }}
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
            <p className="text-white/30 text-xs tabular-nums">{elapsed}s — usually 20–35 seconds</p>
          </div>
        ) : generated ? (
          <div className="relative w-full">
            <BeforeAfterSlider before={prevGenerated || data.room_image_url} after={generated} />
            {!isPaidUser && <ImageWatermark />}
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

      {/* Fine-Tune Bottom Sheet Modal */}
      <AnimatePresence>
        {showFineTune && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowFineTune(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
              style={{ background: "#111113", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "85vh", overflowY: "auto" }}
            >
              {/* Handle + header */}
              <div className="sticky top-0 px-5 pt-4 pb-3 border-b border-white/8" style={{ background: "#111113" }}>
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Fine-Tune Your Design</p>
                    <p className="text-white/35 text-xs mt-0.5">Pick what to change — AI only edits that, nothing else</p>
                  </div>
                  <button onClick={() => setShowFineTune(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 space-y-5">
                <FineTuneRow
                  label="Wall Color"
                  presets={FINE_TUNE_OPTIONS.wall_color}
                  selected={data.wall_color}
                  accentColor="#1B8FA0" accentBg="rgba(27,143,160,0.2)" accentText="#6EC6C6"
                  onSelect={(v) => update({ wall_color: v })}
                  placeholder="e.g. dusty blue, olive green, warm terracotta…"
                />
                <FineTuneRow
                  label="Sofa / Seating"
                  presets={FINE_TUNE_OPTIONS.sofa_color}
                  selected={data.sofa_color}
                  accentColor="#7c3aed" accentBg="rgba(124,58,237,0.2)" accentText="#a78bfa"
                  onSelect={(v) => update({ sofa_color: v })}
                  placeholder="e.g. deep teal velvet, cream boucle, cognac leather…"
                />
                <FineTuneRow
                  label="Flooring"
                  presets={FINE_TUNE_OPTIONS.floor_type}
                  selected={data.floor_type}
                  accentColor="#C9963A" accentBg="rgba(201,150,58,0.2)" accentText="#C9963A"
                  onSelect={(v) => update({ floor_type: v })}
                  placeholder="e.g. terracotta tiles, grey carpet, bleached oak…"
                />
                {data.room_mode === "furnish" && (
                  <FineTuneRow
                    label="Ceiling"
                    presets={FINE_TUNE_OPTIONS.ceiling_design}
                    selected={data.ceiling_design}
                    accentColor="#D4A0A0" accentBg="rgba(212,160,160,0.2)" accentText="#D4A0A0"
                    onSelect={(v) => update({ ceiling_design: v })}
                    placeholder="e.g. skylights, dark painted ceiling, decorative plaster…"
                  />
                )}
                <div>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">Anything else?</p>
                  <textarea
                    rows={2}
                    value={data.custom_note || ""}
                    onChange={(e) => update({ custom_note: e.target.value })}
                    placeholder="e.g. add more plants, make it feel cosier, include a fireplace…"
                    className="w-full text-sm px-4 py-3 rounded-xl text-white/70 placeholder-white/20 focus:outline-none resize-none leading-relaxed"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(27,143,160,0.35)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  />
                </div>

                {/* Apply button inside sheet */}
                <button
                  onClick={() => { setShowFineTune(false); generate(true); }}
                  disabled={loading || !credits || credits.credits_remaining < 1}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", color: "white", boxShadow: "0 4px 24px rgba(27,143,160,0.4)" }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Apply changes — uses 1 credit
                </button>
                <div className="h-4" /> {/* safe-area bottom padding */}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Primary CTA row — Save & Shop + Fine-Tune side by side */}
        {generated && !loading && (
          <div className="flex gap-2.5">
            <button
              onClick={handleSaveAndShop}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 text-white font-semibold py-4 rounded-2xl transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", boxShadow: "0 8px 32px rgba(27,143,160,0.3)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
              {saving ? "Saving…" : "Save & Shop"}
            </button>
            {/* Fine-Tune button — opens bottom sheet */}
            <button
              onClick={() => setShowFineTune(true)}
              className="relative flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-semibold text-sm transition-all hover:opacity-90"
              style={{
                background: hasPendingChanges ? "rgba(27,143,160,0.2)" : "rgba(255,255,255,0.06)",
                border: hasPendingChanges ? "1px solid rgba(27,143,160,0.5)" : "1px solid rgba(255,255,255,0.1)",
                color: hasPendingChanges ? "#6EC6C6" : "rgba(255,255,255,0.6)",
              }}
            >
              <Sliders className="w-4 h-4" />
              Fine-Tune
              {hasPendingChanges && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-[#0A0A0B]" />
              )}
            </button>
          </div>
        )}

        {/* Secondary row: Back + Generate/Credits + Download + Share */}
        <div className="flex gap-2.5">
          <button
            onClick={onBack}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
          >
            Back
          </button>

          {!credits ? (
            <button disabled className="flex items-center gap-2 flex-1 justify-center px-5 py-3.5 rounded-xl text-sm font-medium opacity-50 cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </button>
          ) : credits.credits_remaining < 2 ? (
            <button
              onClick={handleBuyCredits}
              className="flex items-center gap-2 flex-1 justify-center px-5 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)", color: "white" }}
            >
              <CreditCard className="w-4 h-4" /> Get More Credits
            </button>
          ) : (
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 flex-1 justify-center px-5 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: "rgba(27,143,160,0.15)", border: "1px solid rgba(27,143,160,0.35)", color: "#1B8FA0" }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : generated ? (
                <><RefreshCw className="w-4 h-4" /> Regenerate</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Design</>
              )}
            </button>
          )}

          {generated && !loading && (
            <>
              {isPaidUser ? (
                <button
                  onClick={handleDownload}
                  title="Download"
                  className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                >
                  <Download className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate(createPageUrl("Pricing"))}
                  title="Upgrade to download"
                  className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(201,150,58,0.12)", border: "1px solid rgba(201,150,58,0.3)", color: "#C9963A" }}
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleShare}
                title={copied ? "Copied!" : "Share"}
                className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: copied ? "#1B8FA0" : "rgba(255,255,255,0.5)" }}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Google Lens global search — paid users, shown after generation */}
        {generated && !loading && (
          isPaidUser ? (
            <button
              onClick={() => window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(generated)}`, "_blank")}
              className="w-full mt-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
            >
              <Globe className="w-4 h-4" />
              Search this design globally with Google Lens
            </button>
          ) : (
            <button
              onClick={() => navigate(createPageUrl("Pricing"))}
              className="w-full mt-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all hover:opacity-70"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)" }}
            >
              <Lock className="w-3.5 h-3.5" />
              Search globally with Google Lens
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(201,150,58,0.15)", color: "#C9963A", border: "1px solid rgba(201,150,58,0.3)" }}>PRO</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}