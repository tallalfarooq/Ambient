import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Palette, Sparkles, Check, ScanSearch, Plus } from "lucide-react";
import { toast } from "sonner";
import StepUpload      from "@/components/studio/StepUpload";
import StepStyle       from "@/components/studio/StepStyle";
import StepGenerate    from "@/components/studio/StepGenerate";
import StepFindSimilar from "@/components/studio/StepFindSimilar";
import { useLanguage } from "@/lib/LanguageContext";

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
    intensity:           65,
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
  const stepProps = { data, update, onNext: () => setStep((s) => s + 1), onBack: () => setStep((s) => s - 1) };

  useEffect(() => {
    if (!data.room_image_url) return;
    try { localStorage.setItem("ambient_studio_session", JSON.stringify({ ...data, _step: step })); } catch {}
  }, [data, step]);

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
  }, []);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const uc = await base44.entities.UserCredits.filter({ user_email: u.email });
      if (uc.length > 0) setCredits(uc[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success(t("studio_payment_success"));
      window.history.replaceState({}, "", "/Studio");
      base44.auth.me().then(async (u) => {
        const uc = await base44.entities.UserCredits.filter({ user_email: u.email });
        if (uc.length > 0) setCredits(uc[0]);
      }).catch(() => {});
    } else if (params.get("payment") === "cancelled") {
      toast.info(t("studio_payment_cancelled"));
      window.history.replaceState({}, "", "/Studio");
    }

    const redesignId = params.get("redesign_id");
    if (redesignId) {
      window.history.replaceState({}, "", "/Studio");
      base44.entities.RoomDesign.filter({ id: redesignId })
        .then((results) => {
          if (!results.length) return;
          const d = results[0];
          setData((prev) => ({
            ...prev,
            name:                d.name || "My Room Design",
            room_type:           d.room_type || prev.room_type,
            room_mode:           "redesign",
            room_image_url:      d.generated_render_url || d.room_image_url,
            style:               d.style || prev.style,
            color_palette:       d.color_palette || prev.color_palette,
            vibes:               d.vibes || prev.vibes,
            sustainability_mode: d.sustainability_mode ?? prev.sustainability_mode,
            intensity:           50,
            generated_render_url: d.generated_render_url || null,
          }));
          setStep(2);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white overflow-x-hidden">
      <style>{`
        @keyframes floatOrb {
          0%,100%{transform:translate(0,0) scale(1);}
          33%{transform:translate(20px,-30px) scale(1.05);}
          66%{transform:translate(-15px,20px) scale(.95);}
        }
      `}</style>

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div style={{ position: "absolute", width: 700, height: 700, top: -150, right: -150, background: "radial-gradient(circle, rgba(27,143,160,0.13), transparent 70%)", filter: "blur(100px)", animation: "floatOrb 16s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 500, height: 500, bottom: -100, left: -100, background: "radial-gradient(circle, rgba(201,150,58,0.09), transparent 70%)", filter: "blur(100px)", animation: "floatOrb 16s ease-in-out infinite", animationDelay: "-7s" }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-24 pt-10">

        {/* ── Mode Switcher ─────────────────────────────────── */}
        <div className="flex items-center justify-center mb-10" style={{ position: "relative" }}>
          {step > 0 && (
            <button
              onClick={() => {
                try { localStorage.removeItem("ambient_studio_session"); } catch {}
                setStep(0);
                setData({
                  name: "My Room Design", room_type: null, room_mode: "redesign",
                  room_image_url: null, room_file_url: null, style: null,
                  color_palette: "", vibes: [], sustainability_mode: false, intensity: 65,
                  room_dimensions: { width: 4, length: 5, height: 2.8 },
                  wall_color: null, sofa_color: null, floor_type: null,
                  ceiling_design: null, custom_note: "", design_id: null,
                });
              }}
              className="absolute right-0 flex items-center gap-2 text-white font-semibold px-4 py-2.5 rounded-2xl transition-opacity hover:opacity-90 text-sm"
              style={{ background: "linear-gradient(135deg, #1B8FA0, #C9963A)" }}
            >
              <Plus className="w-4 h-4" /> {t("studio_new_design")}
            </button>
          )}
          <div className="flex items-center gap-1 p-1 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setMode("design")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "design" ? "text-white shadow-lg" : "text-white/40 hover:text-white/70"}`}
              style={mode === "design" ? { background: "#1B8FA0" } : {}}
            >
              <Sparkles className="w-4 h-4" /> {t("studio_mode_design")}
            </button>
            <button
              onClick={() => setMode("find")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === "find" ? "text-white shadow-lg" : "text-white/40 hover:text-white/70"}`}
              style={mode === "find" ? { background: "#C9963A" } : {}}
            >
              <ScanSearch className="w-4 h-4" /> {t("studio_mode_find")}
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,150,58,0.25)", color: "#C9963A" }}>PRO</span>
            </button>
          </div>
        </div>

        {/* ── Find Similar Mode ─────────────────────────────── */}
        {mode === "find" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">{t("studio_find_title")}</h1>
              <p className="text-white/40 text-sm">{t("studio_find_sub")}</p>
            </div>
            <div className="rounded-3xl p-6 sm:p-8 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)" }}>
              <StepFindSimilar user={user} credits={credits} />
            </div>
          </div>
        )}

        {/* ── Design Mode ───────────────────────────────────── */}
        {mode === "design" && (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={`hd-${step}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }} className="text-center mb-10"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4"
                  style={{ background: "rgba(27,143,160,0.12)", border: "1px solid rgba(27,143,160,0.25)", color: "#1B8FA0" }}>
                  {(() => { const s = STEPS[step] || STEPS[STEPS.length - 1]; const Icon = s.Icon; return <Icon className="w-3 h-3" />; })()}
                  {t("studio_step_label")} {Math.min(step, STEPS.length - 1) + 1} {t("studio_step_of")} {STEPS.length}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                  {(STEP_HEADLINES[step] || STEP_HEADLINES[STEP_HEADLINES.length - 1]).title}
                </h1>
                <p className="text-white/40 text-sm">
                  {(STEP_HEADLINES[step] || STEP_HEADLINES[STEP_HEADLINES.length - 1]).sub}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center mb-10">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${i < step ? "" : i === step ? "ring-2 ring-offset-2 ring-offset-[#0A0A0B]" : "bg-white/5 ring-1 ring-white/10"}`}
                        style={i < step ? { background: "#1B8FA0" } : i === step ? { background: "rgba(27,143,160,0.15)", ringColor: "#1B8FA0" } : {}}>
                        {i < step
                          ? <Check className="w-4 h-4 text-white" />
                          : <s.Icon className={`w-4 h-4 ${i === step ? "" : "text-white/20"}`} style={i === step ? { color: "#1B8FA0" } : {}} />
                        }
                      </div>
                      {i === step && (
                        <div className="absolute inset-0 rounded-full blur-lg -z-10 animate-pulse" style={{ background: "rgba(27,143,160,0.25)" }} />
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide hidden sm:block transition-colors ${i === step ? "text-white/70" : i < step ? "text-white/40" : "text-white/15"}`}>
                      {s.sublabel}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mx-3 mb-5 h-px relative overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: "linear-gradient(90deg, #1B8FA0, #C9963A)" }}
                        initial={false}
                        animate={{ width: i < step ? "100%" : "0%" }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="rounded-3xl p-6 sm:p-8 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)" }}>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.28, ease: "easeOut" }}>
                  {step === 0 && <StepUpload   {...stepProps} />}
                  {step === 1 && <StepStyle    {...stepProps} />}
                  {step === 2 && <StepGenerate {...stepProps} onComplete={() => {}} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}