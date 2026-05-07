import React, { useState, useEffect } from "react";
import { apiClient } from "@/api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Palette, Sparkles, Check, ScanSearch, Plus } from "lucide-react";
import { toast } from "sonner";
import StepUpload      from "@/components/studio/StepUpload";
import StepStyle       from "@/components/studio/StepStyle";
import StepGenerate    from "@/components/studio/StepGenerate";
import StepFindSimilar from "@/components/studio/StepFindSimilar";
import StudioPreview   from "@/components/studio/StudioPreview";
import { useLanguage } from "@/lib/LanguageContext";
import { EyebrowText } from "@/components/ds";

/**
 * Studio — Apple-clean redesign (Day 5.5).
 *
 * Layout intent: a real "studio" — wide working area with persistent context
 * (the StudioPreview sidebar showing your room and current selections),
 * cleaner step chrome, and a refined header that actually looks like a pro
 * tool. The step components themselves (StepUpload, StepStyle, StepGenerate,
 * StepFindSimilar) are unchanged — they're tuned and working, no reason to
 * rebuild what isn't broken.
 *
 * Mobile keeps a single-column flow; the preview sidebar collapses entirely.
 *
 * Old Studio is preserved as Studio.legacy.jsx in this same folder.
 */
export default function Studio() {
  const [mode,    setMode]    = useState("design");
  const [user,    setUser]    = useState(null);
  const [credits, setCredits] = useState(null);
  const [step,    setStep]    = useState(0);
  const [data,    setData]    = useState({
    name:                "My Room Design",
    room_type:           null,
    room_mode:           "redesign",
    room_image_url:      null,
    room_file_url:       null,
    style:               null,
    color_palette:       "",
    vibes:               [],
    sustainability_mode: false,
    intensity:           35,
    room_dimensions:     { width: 4, length: 5, height: 2.8 },
    wall_color:          null,
    sofa_color:          null,
    floor_type:          null,
    ceiling_design:      null,
    custom_note:         "",
    design_id:           null,
  });

  const { t } = useLanguage();

  const STEPS = [
    { label: t("studio_step_upload"),   sublabel: t("studio_sub_upload"),   Icon: Camera   },
    { label: t("studio_step_style"),    sublabel: t("studio_sub_style"),    Icon: Palette  },
    { label: t("studio_step_generate"), sublabel: t("studio_sub_generate"), Icon: Sparkles },
  ];

  const STEP_HEADLINES = [
    { title: t("studio_hl0_title"), sub: t("studio_hl0_sub") },
    { title: t("studio_hl1_title"), sub: t("studio_hl1_sub") },
    { title: t("studio_hl2_title"), sub: t("studio_hl2_sub") },
  ];

  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const stepProps = {
    data,
    update,
    onNext: () => setStep((s) => s + 1),
    onBack: () => setStep((s) => s - 1),
  };

  const resetData = () => ({
    name: "My Room Design", room_type: null, room_mode: "redesign",
    room_image_url: null, room_file_url: null, style: null,
    color_palette: "", vibes: [], sustainability_mode: false, intensity: 35,
    room_dimensions: { width: 4, length: 5, height: 2.8 },
    wall_color: null, sofa_color: null, floor_type: null,
    ceiling_design: null, custom_note: "", design_id: null,
  });

  // Persist wizard progress so accidental nav doesn't lose work.
  useEffect(() => {
    if (!data.room_image_url) return;
    try {
      localStorage.setItem(
        "ambient_studio_session",
        JSON.stringify({ ...data, _step: step })
      );
    } catch {}
  }, [data, step]);

  // Hydrate from prior session OR from a "draft" left when redirected through login.
  useEffect(() => {
    try {
      const loginDraft = localStorage.getItem("ambient_studio_draft");
      if (loginDraft) {
        const { _step, ...savedData } = JSON.parse(loginDraft);
        setData((d) => ({ ...d, ...savedData }));
        if (_step != null) setStep(Math.min(_step, STEPS.length - 1));
        localStorage.removeItem("ambient_studio_draft");
        return;
      }
      const session = localStorage.getItem("ambient_studio_session");
      if (session) {
        const { _step, ...savedData } = JSON.parse(session);
        if (savedData.room_image_url) {
          setData((d) => ({ ...d, ...savedData }));
          if (_step != null) setStep(Math.min(_step, STEPS.length - 1));
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load user + credits.
  useEffect(() => {
    apiClient.auth.me().then(async (u) => {
      setUser(u);
      const uc = await apiClient.entities.UserCredits.filter({ user_email: u.email });
      if (uc.length > 0) setCredits(uc[0]);
    }).catch(() => {});
  }, []);

  // Handle ?payment=success / ?redesign_id=... query params from Stripe + Detect & Shop.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success(t("studio_payment_success"));
      window.history.replaceState({}, "", "/Studio");
      apiClient.auth.me().then(async (u) => {
        const uc = await apiClient.entities.UserCredits.filter({ user_email: u.email });
        if (uc.length > 0) setCredits(uc[0]);
      }).catch(() => {});
    } else if (params.get("payment") === "cancelled") {
      toast.info(t("studio_payment_cancelled"));
      window.history.replaceState({}, "", "/Studio");
    }

    const redesignId = params.get("redesign_id");
    if (redesignId) {
      window.history.replaceState({}, "", "/Studio");
      apiClient.entities.RoomDesign.filter({ id: redesignId })
        .then((results) => {
          if (!results.length) return;
          const d = results[0];
          setData((prev) => ({
            ...prev,
            name:                 d.name || "My Room Design",
            room_type:            d.room_type || prev.room_type,
            room_mode:            "redesign",
            room_image_url:       d.generated_render_url || d.room_image_url,
            style:                d.style || prev.style,
            color_palette:        d.color_palette || prev.color_palette,
            vibes:                d.vibes || prev.vibes,
            sustainability_mode:  d.sustainability_mode ?? prev.sustainability_mode,
            intensity:            50,
            generated_render_url: d.generated_render_url || null,
          }));
          setStep(2);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-white relative overflow-hidden">
      {/* Soft ambient backdrop — subtle radial glow, no jiggling orbs anymore. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(27,143,160,0.08), transparent 60%)," +
            "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(201,150,58,0.05), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">

        {/* ── Studio header ─────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8 sm:mb-10">
          <div>
            <EyebrowText>Studio</EyebrowText>
            <h1 className="mt-3 text-[28px] sm:text-[36px] lg:text-headline font-extrabold tracking-tight text-white">
              Design your space
            </h1>
            <p className="mt-1 text-caption sm:text-body text-white/45 leading-relaxed">
              Upload a photo, pick a style, generate. {credits && (
                <span className="text-white/65 font-semibold">
                  {credits.credits_remaining} credit{credits.credits_remaining === 1 ? "" : "s"} remaining.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            {/* Mode tabs */}
            <div
              className="flex items-center gap-1 p-1 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <button
                onClick={() => setMode("design")}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-caption font-semibold transition-all ${
                  mode === "design" ? "text-white shadow-lg" : "text-white/45 hover:text-white/75"
                }`}
                style={mode === "design" ? { background: "#1B8FA0" } : {}}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t("studio_mode_design")}</span>
              </button>
              <button
                onClick={() => setMode("find")}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-caption font-semibold transition-all ${
                  mode === "find" ? "text-white shadow-lg" : "text-white/45 hover:text-white/75"
                }`}
                style={mode === "find" ? { background: "#C9963A" } : {}}
              >
                <ScanSearch className="w-3.5 h-3.5" />
                <span>{t("studio_mode_find")}</span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(201,150,58,0.25)", color: "#C9963A" }}
                >
                  PRO
                </span>
              </button>
            </div>

            {/* New design — only visible when mid-flow */}
            {step > 0 && mode === "design" && (
              <button
                onClick={() => {
                  try { localStorage.removeItem("ambient_studio_session"); } catch {}
                  setStep(0);
                  setData(resetData());
                }}
                className="flex items-center justify-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-caption transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("studio_new_design")}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Find-Similar mode ─────────────────────────────────── */}
        {mode === "find" && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                {t("studio_find_title")}
              </h2>
              <p className="text-white/45 text-caption">{t("studio_find_sub")}</p>
            </div>
            <div
              className="rounded-3xl p-5 sm:p-8 backdrop-blur-2xl"
              style={{
                background: "rgba(20,20,24,0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
              }}
            >
              <StepFindSimilar user={user} credits={credits} />
            </div>
          </div>
        )}

        {/* ── Design mode — split layout ────────────────────────── */}
        {mode === "design" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            {/* Main wizard column (8/12 on desktop) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Step progress bar */}
              <div className="flex items-center">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.label}>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className="relative">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 ${
                            i < step
                              ? ""
                              : i === step
                              ? "ring-2 ring-offset-2 ring-offset-[#0A0A0B]"
                              : "bg-white/5 ring-1 ring-white/10"
                          }`}
                          style={
                            i < step
                              ? { background: "#1B8FA0" }
                              : i === step
                              ? { background: "rgba(27,143,160,0.15)" }
                              : {}
                          }
                        >
                          {i < step ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <s.Icon
                              className={`w-4 h-4 ${i === step ? "" : "text-white/20"}`}
                              style={i === step ? { color: "#1B8FA0" } : {}}
                            />
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-semibold tracking-wide hidden sm:block transition-colors ${
                          i === step
                            ? "text-white/70"
                            : i < step
                            ? "text-white/40"
                            : "text-white/15"
                        }`}
                      >
                        {s.sublabel}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className="flex-1 mx-2 mb-5 h-px relative overflow-hidden rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <motion.div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ background: "linear-gradient(90deg, #1B8FA0, #C9963A)" }}
                          initial={false}
                          animate={{ width: i < step ? "100%" : "0%" }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Step headline */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`hd-${step}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h2 className="text-[22px] sm:text-[26px] lg:text-title font-bold tracking-tight">
                    {(STEP_HEADLINES[step] || STEP_HEADLINES[STEP_HEADLINES.length - 1]).title}
                  </h2>
                  <p className="text-white/45 text-caption sm:text-body mt-1">
                    {(STEP_HEADLINES[step] || STEP_HEADLINES[STEP_HEADLINES.length - 1]).sub}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Step content surface */}
              <div
                className="rounded-3xl p-5 sm:p-8 backdrop-blur-2xl"
                style={{
                  background: "rgba(20,20,24,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {step === 0 && <StepUpload   {...stepProps} />}
                    {step === 1 && <StepStyle    {...stepProps} />}
                    {step === 2 && <StepGenerate {...stepProps} onComplete={() => {}} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Persistent preview + summary sidebar (4/12 on desktop, hidden on mobile) */}
            <div className="hidden lg:block lg:col-span-4">
              <StudioPreview data={data} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
