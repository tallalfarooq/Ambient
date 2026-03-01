import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import StepUpload from "@/components/studio/StepUpload";
import StepStyle from "@/components/studio/StepStyle";
import StepBudget from "@/components/studio/StepBudget";
import StepGenerate from "@/components/studio/StepGenerate";

const STEPS = ["Upload Room", "Choose Style", "Set Budget", "Generate"];

export default function Studio() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: "My Room Design",
    room_image_url: null,
    room_file_url: null,
    style: null,
    color_palette: "",
    vibes: [],
    budget_min: 500,
    budget_max: 3000,
    sustainability_mode: false,
    room_dimensions: { width: 4, length: 5, height: 2.8 },
  });

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  const handleComplete = async (finalData) => {
    const merged = { ...data, ...finalData };
    const record = await base44.entities.RoomDesign.create({
      ...merged,
      status: "generating",
    });
    navigate(createPageUrl(`Design?id=${record.id}`));
  };

  const stepProps = { data, update, onNext: () => setStep((s) => s + 1), onBack: () => setStep((s) => s - 1) };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                    i < step
                      ? "bg-violet-500 border-violet-500 text-white"
                      : i === step
                      ? "border-violet-400 text-violet-400"
                      : "border-white/15 text-white/25"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs hidden sm:block transition-colors ${
                    i === step ? "text-white/80" : "text-white/25"
                  }`}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-all ${i < step ? "bg-violet-500" : "bg-white/10"}`} style={{ width: 24 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && <StepUpload {...stepProps} />}
            {step === 1 && <StepStyle {...stepProps} />}
            {step === 2 && <StepBudget {...stepProps} />}
            {step === 3 && <StepGenerate {...stepProps} onComplete={handleComplete} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}