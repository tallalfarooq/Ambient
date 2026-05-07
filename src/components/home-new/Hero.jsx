import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/api/apiClient";
import { DisplayHeading, EyebrowText, GradientButton, MotionSection } from "@/components/ds";

// Lazy-load the 3D scene — keeps Three.js out of the initial bundle, so the
// hero text appears instantly and the 3D streams in.
const RoomScene3D = lazy(() => import("./RoomScene3D"));

/**
 * Hero — full-viewport-height section that opens the Home page.
 *
 * Composition:
 *   - Eyebrow ("AI-POWERED INTERIOR DESIGN") in tracked teal caps
 *   - Display headline with subtle gradient text
 *   - One-line value-prop subhead
 *   - Two CTAs (primary teal→gold gradient, secondary glass)
 *   - Right side: rotating 3D room (lazy-loaded)
 *   - Behind everything: subtle radial gradient backdrop
 *
 * Logged-in users see "Open Studio" instead of "Start Designing — Free", so
 * returning visitors don't get re-pitched to.
 */
export default function Hero() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);

  // Crude device-tier detection. If the device has very few logical cores or
  // a tiny viewport, skip the WebGL render and show a static gradient instead.
  // This is a launch-week stopgap; we'll replace with proper feature detection
  // once we have Sentry data on which devices actually struggle.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const cores = navigator.hardwareConcurrency || 4;
    const isSmallViewport = window.innerWidth < 480;
    setIsLowEndDevice(cores <= 2 || isSmallViewport);
  }, []);

  const handlePrimaryClick = () => {
    if (isAuthenticated) {
      navigate(createPageUrl("Studio"));
    } else {
      apiClient.auth.redirectToLogin("/Studio");
    }
  };

  const handleSecondaryClick = () => {
    // Smooth-scroll to the use-cases section right below the hero.
    const target = document.getElementById("use-cases");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative min-h-[88vh] sm:min-h-screen flex items-center overflow-hidden">
      {/* Backdrop — soft radial wash with brand teal/gold at low opacity. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 70% 20%, rgba(27,143,160,0.18), transparent 60%)," +
            "radial-gradient(ellipse 80% 60% at 20% 80%, rgba(201,150,58,0.10), transparent 70%)," +
            "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(20,20,24,0) 0%, #0A0A0B 80%)",
        }}
      />
      {/* Subtle grid texture for depth (very low opacity, not distracting) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 sm:py-24 lg:py-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left column — copy + CTAs */}
          <MotionSection
            as="div"
            stagger
            className="lg:col-span-7 flex flex-col gap-7 sm:gap-8 max-w-2xl"
          >
            <MotionSection.Item>
              <EyebrowText>AI-Powered Interior Design</EyebrowText>
            </MotionSection.Item>

            <MotionSection.Item>
              <DisplayHeading gradient>
                Redesign your space in minutes.
              </DisplayHeading>
            </MotionSection.Item>

            <MotionSection.Item>
              <p className="text-body-lg text-white/55 max-w-xl leading-relaxed">
                Upload a photo of any room. Pick a style. Watch AI transform your space —
                and shop every piece of furniture you see, instantly.
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
                  {isAuthenticated ? "Open Studio" : "Start designing — free"}
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
                  2 free credits to start
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Real shoppable furniture
                </span>
              </div>
            </MotionSection.Item>
          </MotionSection>

          {/* Right column — 3D room scene */}
          <MotionSection
            as="div"
            className="lg:col-span-5 relative aspect-square w-full max-w-[560px] mx-auto lg:mx-0 lg:ml-auto"
          >
            <Suspense
              fallback={
                <div
                  className="w-full h-full rounded-3xl"
                  style={{
                    background:
                      "radial-gradient(ellipse at 30% 30%, rgba(27,143,160,0.15), transparent 70%)",
                  }}
                />
              }
            >
              <RoomScene3D disabled={isLowEndDevice} />
            </Suspense>
            {/* Soft glow behind the scene for depth */}
            <div
              aria-hidden
              className="absolute -inset-10 -z-10 blur-3xl opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(27,143,160,0.25), transparent 70%)",
              }}
            />
          </MotionSection>
        </div>
      </div>

      {/* Scroll indicator — small chevron at the bottom that fades on scroll */}
      <div
        aria-hidden
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-white/30"
      >
        <span className="text-eyebrow uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  );
}
