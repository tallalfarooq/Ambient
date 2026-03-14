import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Palette, Wallet, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import StepUpload   from "@/components/studio/StepUpload";
import StepStyle    from "@/components/studio/StepStyle";
import StepBudget   from "@/components/studio/StepBudget";
import StepGenerate from "@/components/studio/StepGenerate";

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
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name:                "My Room Design",
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
  });

  const update    = (patch) => setData((d) => ({ ...d, ...patch }));
  const stepProps = { data, update, onNext: () => setStep((s) => s + 1), onBack: () => setStep((s) => s - 1) };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast.success('Payment successful! 10 credits added to your account.');
      window.history.replaceState({}, '', '/Studio');
    } else if (params.get('payment') === 'cancelled') {
      toast.error('Payment cancelled.');
      window.history.replaceState({}, '', '/Studio');
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
          background: "radial-gradient(circle, rgba(107,79,187,0.13), transparent 70%)",
          filter: "blur(100px)", animation: "floatOrb 16s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, bottom: -100, left: -100,
          background: "radial-gradient(circle, rgba(29,158,117,0.09), transparent 70%)",
          filter: "blur(100px)", animation: "floatOrb 16s ease-in-out infinite", animationDelay: "-7s",
        }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-24 pt-10">

        {/* ── Step headline ─────────────────────────────────────── */}
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
              style={{ background: "rgba(107,79,187,0.12)", border: "1px solid rgba(107,79,187,0.25)", color: "#a78bfa" }}
            >
              {(() => { const Icon = STEPS[step].Icon; return <Icon className="w-3 h-3" />; })()}
              Step {step + 1} of {STEPS.length}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">{STEP_HEADLINES[step].title}</h1>
            <p className="text-white/40 text-sm">{STEP_HEADLINES[step].sub}</p>
          </motion.div>
        </AnimatePresence>

        {/* ── Progress stepper ──────────────────────────────────── */}
        <div className="flex items-center mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    i < step
                      ? "bg-violet-500"
                      : i === step
                      ? "bg-violet-500/15 ring-2 ring-violet-400 ring-offset-2 ring-offset-[#0A0A0B]"
                      : "bg-white/5 ring-1 ring-white/10"
                  }`}>
                    {i < step
                      ? <Check className="w-4 h-4 text-white" />
                      : <s.Icon className={`w-4 h-4 ${i === step ? "text-violet-400" : "text-white/20"}`} />
                    }
                  </div>
                  {i === step && (
                    <div className="absolute inset-0 rounded-full bg-violet-500/25 blur-lg -z-10 animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold tracking-wide hidden sm:block transition-colors ${
                  i === step ? "text-white/70" : i < step ? "text-violet-400/60" : "text-white/15"
                }`}>
                  {s.sublabel}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-3 mb-5 h-px relative overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }}
                    initial={false}
                    animate={{ width: i < step ? "100%" : "0%" }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step card ─────────────────────────────────────────── */}
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
      </div>
    </div>
  );
}