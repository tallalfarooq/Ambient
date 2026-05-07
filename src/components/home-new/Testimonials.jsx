import { Star } from "lucide-react";
import { DisplayHeading, EyebrowText, GlassCard, MotionSection } from "@/components/ds";

/**
 * Testimonials — three quote cards in a single row on desktop.
 *
 * Quotes are kept verbatim from the original Home (real wording, real names).
 * Restyled with GlassCard primitives for visual consistency with the rest of
 * the redesigned page.
 */

const QUOTES = [
  {
    rating: 5,
    text:
      "I redesigned my entire living room in 20 minutes. The Japandi style Ambient Space generated was exactly what I'd been dreaming of for years — and every furniture piece had a shopping link.",
    name: "Sarah M.",
    role: "Homeowner · Berlin",
    initial: "S",
    color: "#1B8FA0",
  },
  {
    rating: 5,
    text:
      "Used Ambient Space for our entire office renovation. Saved 3 weeks of planning. The furniture recommendations from AI were remarkably accurate and affordable.",
    name: "Kai L.",
    role: "Startup Founder · Amsterdam",
    initial: "K",
    color: "#7c3aed",
  },
  {
    rating: 5,
    text:
      "Finally an AI that truly understands interior design. The style consistency is incredible, and the before-after comparison blew every client away.",
    name: "Priya K.",
    role: "Interior Designer · London",
    initial: "P",
    color: "#C9963A",
  },
];

function QuoteCard({ rating, text, name, role, initial, color }) {
  return (
    <GlassCard padding="lg" hover className="h-full flex flex-col">
      {/* Star rating */}
      <div className="flex gap-1 mb-5">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-[#C9963A] text-[#C9963A]" strokeWidth={0} />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="flex-1">
        <p className="text-body text-white/80 leading-relaxed">"{text}"</p>
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3 mt-7 pt-6 border-t border-white/8">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          }}
        >
          {initial}
        </div>
        <div className="flex flex-col">
          <span className="text-caption font-semibold text-white">{name}</span>
          <span className="text-[12px] text-white/40">{role}</span>
        </div>
      </div>
    </GlassCard>
  );
}

export default function Testimonials() {
  return (
    <section className="relative py-24 sm:py-section-mobile lg:py-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <MotionSection className="max-w-2xl mb-16 sm:mb-20 text-center mx-auto">
          <div className="inline-block">
            <EyebrowText>Loved by designers and homeowners</EyebrowText>
          </div>
          <div className="mt-5">
            <DisplayHeading size="lg" as="h2">
              Real people. Real rooms. Real results.
            </DisplayHeading>
          </div>
        </MotionSection>

        <MotionSection
          stagger
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {QUOTES.map((q) => (
            <MotionSection.Item key={q.name}>
              <QuoteCard {...q} />
            </MotionSection.Item>
          ))}
        </MotionSection>
      </div>
    </section>
  );
}
