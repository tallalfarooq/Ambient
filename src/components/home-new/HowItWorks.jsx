import { Camera, Wand2, ShoppingBag } from "lucide-react";
import { DisplayHeading, EyebrowText, MotionSection } from "@/components/ds";

/**
 * HowItWorks — three-step explanation of the workflow.
 *
 * Layout: vertical-stack on mobile, 3-column row on desktop. Each step has
 * a numbered eyebrow, big icon, headline, body, and an illustrative image.
 * Connector lines between steps on desktop give visual rhythm.
 *
 * Future enhancement: convert to a sticky-scroll section where each step
 * fades in/out as the user scrolls. For now keeping it static for clarity.
 */

const STEPS = [
  {
    number: "01",
    icon: Camera,
    title: "Upload your room photo.",
    body: "Snap a photo with your phone or drag in a saved image. Empty rooms work as well as furnished ones — JPG, PNG, or HEIC, up to 20MB.",
    image:
      "https://images.unsplash.com/photo-1631049552240-59c37f38802b?auto=format&fit=crop&w=900&q=80",
  },
  {
    number: "02",
    icon: Wand2,
    title: "Pick a style and budget.",
    body: "Choose from Japandi, Mid-century, Scandinavian, Industrial, and more. Set your budget per item so AI suggests pieces you can actually afford.",
    image:
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=900&q=80",
  },
  {
    number: "03",
    icon: ShoppingBag,
    title: "Generate, review, shop.",
    body: "Get a photoreal render in 20–30 seconds. Every piece of furniture in the image is tagged and shoppable on Amazon, IKEA, or Wayfair with one click.",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
  },
];

function StepCard({ number, icon: Icon, title, body, image, isLast }) {
  return (
    <div className="relative">
      <div className="flex flex-col rounded-3xl overflow-hidden bg-[rgba(20,20,24,0.6)] backdrop-blur-2xl border border-white/8 h-full">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={image} alt="" loading="lazy" className="w-full h-full object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
          />
          {/* Number badge top-left */}
          <div className="absolute top-5 left-5 flex items-center gap-2.5">
            <span className="text-eyebrow uppercase text-accent-teal-light bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full">
              Step {number}
            </span>
          </div>
          {/* Icon bottom-right */}
          <div
            className="absolute bottom-5 right-5 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md"
            style={{
              background: "rgba(27,143,160,0.18)",
              border: "1px solid rgba(110,198,198,0.3)",
            }}
          >
            <Icon className="w-5 h-5 text-accent-teal-light" strokeWidth={2.2} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col gap-3 p-7 sm:p-8">
          <h3 className="text-[20px] sm:text-[22px] font-bold text-white leading-tight">
            {title}
          </h3>
          <p className="text-caption sm:text-body text-white/55 leading-relaxed">{body}</p>
        </div>
      </div>

      {/* Connector arrow on desktop, except on the last card */}
      {!isLast && (
        <div
          aria-hidden
          className="hidden lg:block absolute top-[33%] -right-5 w-10 h-px"
          style={{
            background: "linear-gradient(to right, rgba(255,255,255,0.2), transparent)",
          }}
        />
      )}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="relative py-24 sm:py-section-mobile lg:py-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <MotionSection className="max-w-2xl mb-16 sm:mb-20">
          <EyebrowText>How it works</EyebrowText>
          <div className="mt-5">
            <DisplayHeading size="lg" as="h2">
              Three steps. Thirty seconds.{" "}
              <span className="block text-white/40">No design skills needed.</span>
            </DisplayHeading>
          </div>
          <p className="mt-6 text-body-lg text-white/55 max-w-xl leading-relaxed">
            From the photo on your phone to a photoreal redesign with shoppable furniture
            — without ever opening a design app.
          </p>
        </MotionSection>

        <MotionSection
          stagger
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10"
        >
          {STEPS.map((s, i) => (
            <MotionSection.Item key={s.number}>
              <StepCard {...s} isLast={i === STEPS.length - 1} />
            </MotionSection.Item>
          ))}
        </MotionSection>
      </div>
    </section>
  );
}
