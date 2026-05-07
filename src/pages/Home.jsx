/**
 * Home — Apple-clean redesign (Day 5).
 *
 * Composed of focused section components in src/components/home-new/. The
 * old long-form Home is preserved as Home.legacy.jsx for reference.
 *
 * Sections (top → bottom):
 *   1. Hero            — full-viewport, real interior + floating product chips
 *   2. BeforeAfter     — auto-animating slider showcase
 *   3. UseCases        — 4-card grid (B2B real-estate / e-commerce + B2C movers / students)
 *   4. HowItWorks      — three-step explanation (Upload → Style → Shop)
 *   5. StyleGallery    — 8 design styles in a grid
 *   6. Testimonials    — three quote cards
 *   7. PricingTeaser   — final CTA above the footer
 *
 * Footer is rendered by the existing Layout component, not here.
 */
import Hero from "@/components/home-new/Hero";
import BeforeAfterShowcase from "@/components/home-new/BeforeAfterShowcase";
import UseCases from "@/components/home-new/UseCases";
import HowItWorks from "@/components/home-new/HowItWorks";
import StyleGallery from "@/components/home-new/StyleGallery";
import Testimonials from "@/components/home-new/Testimonials";
import PricingTeaser from "@/components/home-new/PricingTeaser";

export default function Home() {
  return (
    <main className="bg-bg-base text-white">
      <Hero />
      <BeforeAfterShowcase />
      <UseCases />
      <HowItWorks />
      <StyleGallery />
      <Testimonials />
      <PricingTeaser />
    </main>
  );
}
