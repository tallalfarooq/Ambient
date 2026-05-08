import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/api/apiClient";
import { DisplayHeading, EyebrowText, GradientButton, MotionSection } from "@/components/ds";
import HeroVisual from "./HeroVisual";

/**
 * Hero — full-viewport-height section that opens the Home page.
 *
 * Composition:
 *   - Eyebrow ("AI-POWERED INTERIOR DESIGN") in tracked teal caps
 *   - Display headline (capped at 72px on desktop, balanced wrapping)
 *   - One-line value-prop subhead
 *   - Two CTAs (primary teal→gold gradient, secondary glass)
 *   - Right side: HeroVisual — real interior photo + floating product chips
 *
 * Logged-in users see "Open Studio" instead of "Start Designing — Free", so
 * returning visitors don't get re-pitched to.
 */
export default function Hero() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Day 8.2 — logged-out users go to /Try (email-gated, no signup).
  // Logged-in users go straight to Studio. This drops the upfront sign-in
  // wall and lets prospects see the wow before committing.
  const handlePrimaryClick = () => {
    if (isAuthenticated) {
      navigate(createPageUrl("Studio"));
    } else {
      navigate("/Try");
    }
  };

  const handleSecondaryClick = () => {
    const target = document.getElementById("use-cases");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative min-h-[88vh] flex items-center overflow-hidden">
      {/* Soft radial backdrop with brand colors at low opacity. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 70% 20%, rgba(27,143,160,0.12), transparent 60%)," +
            "radial-gradient(ellipse 80% 60% at 20% 80%, rgba(201,150,58,0.08), transparent 70%)," +
            "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(20,20,24,0) 0%, #0A0A0B 80%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 sm:py-24 lg:py-28 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left column — copy + CTAs */}
          <MotionSection
            as="div"
            stagger
            className="lg:col-span-7 flex flex-col gap-7 sm:gap-8 max-w-xl"
          >
            <MotionSection.Item>
              <EyebrowText>AI-Powered Interior Design</EyebrowText>
            </MotionSection.Item>

            <MotionSection.Item>
              {/*
                Plain-English headline. Reads in two strong lines on desktop:
                  "See your room transformed by AI."
                  "In seconds."
              */}
              <DisplayHeading gradient>
                See your room transformed by AI.{" "}
                <span className="block">In seconds.</span>
              </DisplayHeading>
            </MotionSection.Item>

            <MotionSection.Item>
              <p className="text-body-lg text-white/55 leading-relaxed max-w-lg">
                Upload a photo. Pick a style. Get a photoreal render of your room
                — with every piece of furniture ready to shop.
              </p>
            </MotionSection.Item>

            <MotionSection.Item>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                <GradientButton
                  size="lg"
                  variant="primary"
                  onClick={handlePrimaryClick}
                  icon={<Sparkles className="w-5 h-5" />}
                  iconPosition="left"
                >
                  {isAuthenticated ? "Open Studio" : "Try free — no signup"}
                </GradientButton>
                <GradientButton
                  size="lg"
                  variant="secondary"
                  onClick={handleSecondaryClick}
                  icon={<ArrowRight className="w-5 h-5" />}
                >
                  See examples
                </GradientButton>
              </div>
            </MotionSection.Item>

            <MotionSection.Item>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-caption text-white/40">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  First design free
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Real shoppable furniture
                </span>
              </div>
            </MotionSection.Item>
          </MotionSection>

          {/* Right column — real interior photo with floating product chips */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
