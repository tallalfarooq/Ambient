import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import StepUpload from "@/components/studio/StepUpload";
import StepStyle from "@/components/studio/StepStyle";
import StepBudget from "@/components/studio/StepBudget";
import StepGenerate from "@/components/studio/StepGenerate";

const STEPS = [
  { label: "Upload Room", short: "Upload"   },
  { label: "Choose Style", short: "Style"  },
  { label: "Set Budget",  short: "Budget"  },
  { label: "Generate",    short: "Generate" },
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

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  const stepProps = {
    data,
    update,
    onNext: () => setStep((s) => s + 1),
    onBack: () => setStep((s) => s - 1),
  };

  return (
    <div className="min-h-screen bg-[#080809] text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-violet-600 rounded-full blur-[120px]"
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-10 pb-24">

        {/* Step indicator */}
        <div className="mb-14">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={{
                      scale: i === step ? 1.12 : 1,
                    }}
                    transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all duration-400 ${
                      i < step
                        ? "bg-violet-500 border-violet-500 text-white"
                        : i === step
                        ? "bg-white border-white text-black"
                        : "bg-transparent border-white/15 text-white/25"
                    }`}
                  >
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </motion.div>
                  <span
                    className={`text-[10px] hidden sm:block font-semibold tracking-wide transition-colors duration-300 ${
                      i === step ? "text-white/80" : i < step ? "text-violet-400" : "text-white/20"
                    }`}
                  >
                    {s.short}
                  </span>
                </div>

                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 mt-[-18px] h-px bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: i < step ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Step label */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-center"
          >
            <span className="text-[11px] uppercase tracking-[0.2em] text-violet-400 font-bold">
              Step {step + 1} of {STEPS.length}
            </span>
            <h2 className="text-xl font-black mt-1">{STEPS[step].label}</h2>
          </motion.div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {step === 0 && <StepUpload   {...stepProps} />}
            {step === 1 && <StepStyle    {...stepProps} />}
            {step === 2 && <StepBudget   {...stepProps} />}
            {step === 3 && <StepGenerate {...stepProps} onComplete={() => {}} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}