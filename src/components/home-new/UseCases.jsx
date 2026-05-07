import { ArrowUpRight } from "lucide-react";
import { DisplayHeading, EyebrowText, MotionSection } from "@/components/ds";

/**
 * UseCases — three-up grid of audience-specific outcome cards.
 *
 * Layout: full-bleed lifestyle photo on top of each card, eyebrow + outcome
 * sentence below, hover-lift on desktop. Mobile stacks vertically with the
 * same imagery, just narrower.
 */

const CASES = [
  {
    eyebrow: "For Homeowners",
    title: "Try 8 styles before committing to a single piece.",
    body: "Stop second-guessing your renovation. Generate a Japandi, mid-century, or industrial version of your living room in 30 seconds — pick the one that actually feels right.",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    accent: "teal",
  },
  {
    eyebrow: "For Renters",
    title: "Reimagine your space without picking up a paintbrush.",
    body: "See how a beige rental transforms with the right sofa, lamp, and rug. Buy the pieces, take them with you when you move out.",
    image:
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80",
    accent: "gold",
  },
  {
    eyebrow: "For Designers",
    title: "Generate client moodboards in 30 seconds, not 3 hours.",
    body: "Show your client three style directions before lunch. Iterate on the spot in the meeting. Win the brief.",
    image:
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1200&q=80",
    accent: "teal",
  },
];

function UseCaseCard({ eyebrow, title, body, image, accent }) {
  const accentRing =
    accent === "gold"
      ? "group-hover:ring-[#C9963A]/40"
      : "group-hover:ring-[#1B8FA0]/40";

  return (
    <article
      className={[
        "group relative flex flex-col rounded-3xl overflow-hidden",
        "bg-[rgba(20,20,24,0.6)] backdrop-blur-2xl border border-white/8",
        "transition-all duration-500 ease-apple",
        "hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl",
        "ring-1 ring-transparent",
        accentRing,
      ].join(" ")}
    >
      {/* Image — fixed aspect ratio so cards align cleanly in the grid */}
      <div className="relative aspect-[4/3] overflow-hidden bg-white/5">
        <img
          src={image}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-apple group-hover:scale-105"
        />
        {/* Gradient overlay so text on top of image stays legible if we add it later */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
        />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-7 sm:p-8 flex-1">
        <EyebrowText color={accent}>{eyebrow}</EyebrowText>
        <h3 className="text-title text-white leading-snug">{title}</h3>
        <p className="text-body text-white/55 leading-relaxed">{body}</p>
        <div className="mt-auto pt-4 flex items-center gap-2 text-caption text-white/40 group-hover:text-white/70 transition-colors">
          <span>Learn more</span>
          <ArrowUpRight
            className="w-3.5 h-3.5 transition-transform duration-300 ease-apple group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={2.5}
          />
        </div>
      </div>
    </article>
  );
}

export default function UseCases() {
  return (
    <section
      id="use-cases"
      className="relative py-24 sm:py-section-mobile lg:py-section"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <MotionSection className="max-w-3xl mb-16 sm:mb-20">
          <EyebrowText>Use cases</EyebrowText>
          <div className="mt-5">
            <DisplayHeading size="lg" as="h2">
              Built for everyone who lives in a space.
            </DisplayHeading>
          </div>
          <p className="mt-6 text-body-lg text-white/55 max-w-2xl leading-relaxed">
            Whether you own, rent, or design for a living — the workflow takes 30 seconds
            and the output is the same: photoreal, shoppable, yours.
          </p>
        </MotionSection>

        <MotionSection
          stagger
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {CASES.map((c) => (
            <MotionSection.Item key={c.eyebrow}>
              <UseCaseCard {...c} />
            </MotionSection.Item>
          ))}
        </MotionSection>
      </div>
    </section>
  );
}
