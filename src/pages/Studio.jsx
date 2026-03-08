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
    name:               "My Room Design",
    room_image_url:     null,
    room_file_url:      null,
    style:              null,
    color_palette:      "",
    vibes:              [],
    budget_min:         500,
    budget_max:         3000,
    budget_tier:        "mid",
    sustainability_mode: false,
    intensity:          65,
    room_dimensions:    { width: 4, length: 5, height: 2.8 },
  });

  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const handleComplete = () => {};

  const stepProps = {
    data,
    update,
    onNext: () => setStep((s) => s + 1),
    onBack: () => setStep((s) => s - 1),
  };

  return (
    <div>
      <div>
        <AnimatePresence mode="wait">
          <motion.div key={step}>
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
