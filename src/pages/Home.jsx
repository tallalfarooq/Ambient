/**
 * Home — Apple-clean redesign (Day 5).
 *
 * Composed of focused section components in src/components/home-new/. The
 * old long-form Home is preserved as Home.legacy.jsx for reference.
 *
 * Sections (top → bottom):
 *   1. Hero            — full-viewport, 3D room, primary CTA
 *   2. BeforeAfter     — auto-animating slider showcase
 *   3. UseCases        — 3-column outcome cards (homeowners / renters / designers)
 *
 * Sections still to land in Day 5.4:
 *   - HowItWorks (sticky-scroll)
 *   - StyleGallery (8-style grid)
 *   - Testimonials (existing copy, restyled)
 *   - PricingTeaser
 *   - Footer cleanup
 */
import Hero from "@/components/home-new/Hero";
import BeforeAfterShowcase from "@/components/home-new/BeforeAfterShowcase";
import UseCases from "@/components/home-new/UseCases";

export default function Home() {
  return (
    <main className="bg-bg-base text-white">
      <Hero />
      <BeforeAfterShowcase />
      <UseCases />
    </main>
  );
}
