import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/api/apiClient";
import { DisplayHeading, EyebrowText, GradientButton, MotionSection } from "@/components/ds";

/**
 * PricingTeaser — final closer above the footer.
 *
 * Two short-form CTAs sized for end-of-page conversion:
 *   - Primary: start designing free (logged-out) / open studio (logged-in)
 *   - Secondary: see full pricing
 *
 * Visual: centered, generous whitespace, brand gradient backdrop on the
 * card that wraps the headline.
 */

export default function PricingTeaser() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handlePrimary = () => {
    if (isAuthenticated) {
      navigate(createPageUrl("Studio"));
    } else {
      apiClient.auth.redirectToLogin("/Studio");
    }
  };

  return (
    <section className="relative py-24 sm:py-section-mobile lg:py-section">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <MotionSection
          className="relative rounded-[36px] p-10 sm:p-16 lg:p-20 overflow-hidden border border-white/8"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(27,143,160,0.15), transparent 60%)," +
              "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(201,150,58,0.10), transparent 70%)," +
              "rgba(20,20,24,0.8)",
          }}
        >
          {/* Subtle ambient grid */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative text-center max-w-3xl mx-auto flex flex-col items-center gap-7 sm:gap-8">
            <EyebrowText>Ready when you are</EyebrowText>

            <DisplayHeading size="lg" gradient>
              Your first redesign is on us.
            </DisplayHeading>

            <p className="text-body-lg text-white/55 max-w-2xl leading-relaxed">
              Your first design is on us — no credit card required. Top up for $5
              when you're ready to do more.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <GradientButton
                size="lg"
                variant="primary"
                onClick={handlePrimary}
                icon={<Sparkles className="w-5 h-5" />}
                iconPosition="left"
              >
                {isAuthenticated ? "Open Studio" : "Start designing — free"}
              </GradientButton>
              <GradientButton
                size="lg"
                variant="secondary"
                to={createPageUrl("Pricing")}
                icon={<ArrowRight className="w-5 h-5" />}
              >
                See full pricing
              </GradientButton>
            </div>
          </div>
        </MotionSection>
      </div>
    </section>
  );
}
