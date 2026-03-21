import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Palette, Wallet, Sparkles, Check, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import StepUpload     from "@/components/studio/StepUpload";
import StepStyle      from "@/components/studio/StepStyle";
import StepBudget     from "@/components/studio/StepBudget";
import StepGenerate   from "@/components/studio/StepGenerate";
import StepFindSimilar from "@/components/studio/StepFindSimilar";

const STEPS = [
  { label: "Upload Room",  sublabel: "Your space",    Icon: Camera   },
  { label: "Choose Style", sublabel: "Design DNA",    Icon: Palette  },
  { label: "Set Budget",   sublabel: "Your range",    Icon: Wallet   },
  { label: "Generate",     sublabel: "Watch AI work", Icon: Sparkles },
];

const STEP_HEADLINES = [
  { title: "Upload your room",     sub: "A photo is all it takes. AI handles the rest."  },
  { title: "Choose your style",    sub: "Pick the aesthetic that speaks to you."          },
  { title: "Set your budget",      sub: "We'll find real furniture within your range."    },
  { title: "Generating your room", sub: "Your AI redesign is being crafted…"             },
];

export default function Studio() {
  const [mode,    setMode]    = useState("design"); // "design" | "find"
  const [user,    setUser]    = useState(null);
  const [credits, setCredits] = useState(null);
  const [step,    setStep]    = useState(0);
  const [data,    setData]    = useState({
    name:                "My Room Design",
    room_type:           null,
    room_mode:           "redesign",   // "redesign" | "furnish"
    room_image_url:      null,
    room_file_url:       null,
    style:               null,
    color_palette:       "",
    vibes:               [],
    budget_min:          500,
    budget_max:          3000,
    budget_tier:         "mid",
    sustainability_mode: false,
    intensity:           65,
    room_dimensions:     { width: 4, length: 5, height: 2.8 },
    wall_color:          null,
    sofa_color:          null,
    floor_type:          null,
    ceiling_design:      null,
    custom_note:         "",
  });

  const update    = (patch) => setData((d) => ({ ...d, ...patch }));
  const stepProps = { data, update, onNext: () => setStep((s) => s + 1), onBack: () => setStep((s) => s - 1) };

  // Restore draft saved before login redirect
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ambient_studio_draft");
      if (raw) {
        const { _step, ...savedData } = JSON.parse(raw);
        setData((d) => ({ ...d, ...savedData }));
        if (_step != null) setStep(_step);
        localStorage.removeItem("ambient_studio_draft");
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
      toast.success("Payment successful! Credits added to your account.");
      window.history.replaceState({}, "", "/Studio");
    } else if (params.get("payment") === "cancelled") {
      toast.error("Payment cancelled.");
      window.history.replaceState({}, "", "/Studio");
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

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div style={{
          position: "absolute", width: 700, height: 700, top: -150, right: -150,
          background: "radial-gradient(circle, rgba(27,143,160,0.13), transparent 70%)",
          filter: "blur(100px)", animation: "floatOrb 16s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, bottom: -100, left: -100,
          background: "radial-gradient(circle, rgba(201,150,58,0.09), transparent 70%)",
          filter: "blur(100px)", animation: "floatOrb 16s ease-in-out infinite", animationDelay: "-7s",
        }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-24 pt-10">

        {/* ── Mode Switcher ─────────────────────────────────────── */}
        <div className="flex items-center justify-center mb-10">
          <div
            className="flex items-center gap-1 p-1 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              onClick={() => setMode("design")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "design"
                  ? "text-white shadow-lg"
                  : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "design" ? { background: "#1B8FA0" } : {}}
            >
              <Sparkles className="w-4 h-4" /> Design Room
            </button>
            <button
              onClick={() => setMode("find")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "find"
                  ? "text-white shadow-lg"
                  : "text-white/40 hover:text-white/70"
              }`}
              style={mode === "find" ? { background: "#C9963A" } : {}}
            >
              <ScanSearch className="w-4 h-4" /> Find Similar
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(201,150,58,0.25)", color: "#C9963A" }}
              >
                PRO
              </span>
            </button>
          </div>
        </div>

        {/* ── Find Similar Mode ─────────────────────────────────── */}
        {mode === "find" && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Find Similar Products</h1>
              <p className="text-white/40 text-sm">Snap any furniture or decor item and AI finds where to buy it</p>
            </div>
            <div
              className="rounded-3xl p-6 sm:p-8 shadow-2xl"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
              }}
            >
              <StepFindSimilar user={user} credits={credits} />
            </div>
          </div>
        )}

        {/* ── Design Mode ───────────────────────────────────────── */}
        {mode === "design" && (
          <>
            {/* Step headline */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`hd-${step}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-10"
              >
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4"
                  style={{ background: "rgba(27,143,160,0.12)", border: "1px solid rgba(27,143,160,0.25)", color: "#1B8FA0" }}
                >
                  {(() => { const Icon = STEPS[step].Icon; return <Icon className="w-3 h-3" />; })()}
                  Step {step + 1} of {STEPS.length}
                </span>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">{STEP_HEADLINES[step].title}</h1>
                <p className="text-white/40 text-sm">{STEP_HEADLINES[step].sub}</p>
              </motion.div>
            </AnimatePresence>

            {/* Progress stepper */}
            <div className="flex items-center mb-10">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        i < step
                          ? ""
                          : i === step
                          ? "ring-2 ring-offset-2 ring-offset-[#0A0A0B]"
                          : "bg-white/5 ring-1 ring-white/10"
                      }`}
                      style={i < step ? { background: "#1B8FA0" } : i === step ? { background: "rgba(27,143,160,0.15)", ringColor: "#1B8FA0" } : {}}
                      >
                        {i < step
                          ? <Check className="w-4 h-4 text-white" />
                          : <s.Icon className={`w-4 h-4 ${i === step ? "" : "text-white/20"}`} style={i === step ? { color: "#1B8FA0" } : {}} />
                        }
                      </div>
                      {i === step && (
                        <div className="absolute inset-0 rounded-full blur-lg -z-10 animate-pulse" style={{ background: "rgba(27,143,160,0.25)" }} />
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide hidden sm:block transition-colors ${
                      i === step ? "text-white/70" : i < step ? "text-white/40" : "text-white/15"
                    }`}>
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

            {/* Step card */}
            <div
              className="rounded-3xl p-6 sm:p-8 shadow-2xl"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {step === 0 && <StepUpload   {...stepProps} />}
                  {step === 1 && <StepStyle    {...stepProps} />}
                  {step === 2 && <StepBudget   {...stepProps} />}
                  {step === 3 && <StepGenerate {...stepProps} onComplete={() => {}} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}

      </div>
    </div>
  );
}