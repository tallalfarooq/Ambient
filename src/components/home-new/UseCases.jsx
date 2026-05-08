import { useState } from "react";
import { ArrowUpRight, Building2, ShoppingBag, Truck, GraduationCap } from "lucide-react";
import { DisplayHeading, EyebrowText, MotionSection } from "@/components/ds";
import ContactSalesModal from "@/components/ContactSalesModal";

/**
 * UseCases — 4-segment grid demonstrating where Ambient Space delivers value.
 *
 * Order matters: business segments lead (anchor enterprise positioning),
 * consumer segments follow (the addressable mass market). Each card has a
 * short stat or proof point that makes the value concrete instead of vague.
 *
 * For launch:
 *   - Business cards link to mailto:support@ambientspace.ai (Contact Sales)
 *   - Consumer cards link to /Studio (try it now)
 *
 * Real B2B integration (API, embed, white-label) is roadmap-level and not
 * shipped this week. The cards capture leads while we validate demand.
 */

// Day 9.1 — `salesSource` keys identify which card the lead came from for
// analytics (and for routing replies). When set, clicking the card opens the
// ContactSalesModal instead of navigating. Consumer cards keep `href` for
// direct navigation to /Studio.
const SEGMENTS = [
  {
    icon: Building2,
    eyebrow: "For Real Estate Platforms",
    title: "Sell or rent properties 50–70% faster.",
    body: "Show buyers and renters what their future home could look like — not just empty walls. Listings with AI-staged photos convert dramatically better than bare-room shots.",
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
    examples: "Immowelt · ImmoScout · Zillow · Rightmove",
    cta: "Talk to sales",
    salesSource: "home_real_estate",
    salesTitle: "Talk to our real estate team",
    salesSubtitle: "Tell us about your platform and listing volume — we'll get back within one business day.",
    accent: "teal",
  },
  {
    icon: ShoppingBag,
    eyebrow: "For Retailers & E-commerce",
    title: "Let shoppers see your furniture in their own room first.",
    body: "Embed Ambient Space on your product pages. Customers upload their room, see your sofa or lamp in their actual space, and buy with confidence.",
    image:
      "https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=1200&q=80",
    examples: "Amazon · IKEA · Wayfair · Article",
    cta: "Talk to sales",
    salesSource: "home_retailer",
    salesTitle: "Talk to our retail team",
    salesSubtitle: "Tell us about your store and what you'd like to embed — we'll be in touch within one business day.",
    accent: "gold",
  },
  {
    icon: Truck,
    eyebrow: "For people moving home",
    title: "Plan your new space before the boxes arrive.",
    body: "Just signed the lease? Upload a photo of your new place, see it furnished in 8 different styles, and shop the pieces you actually want to live with.",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    examples: null,
    cta: "Try it free",
    href: "/Studio",
    accent: "teal",
  },
  {
    icon: GraduationCap,
    eyebrow: "For college students",
    title: "Make any dorm feel like home — under your budget.",
    body: "Set your max budget. Pick your style. Ambient Space designs your room with affordable pieces that actually ship to dorms, with shoppable links for every item.",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    examples: null,
    cta: "Try it free",
    href: "/Studio",
    accent: "gold",
  },
];

function SegmentCard({ icon: Icon, eyebrow, title, body, image, examples, cta, href, salesSource, onOpenSales, accent }) {
  const accentBg =
    accent === "gold"
      ? "bg-[rgba(201,150,58,0.15)] text-[#D4A857]"
      : "bg-[rgba(27,143,160,0.15)] text-accent-teal-light";
  const accentRing =
    accent === "gold"
      ? "group-hover:ring-[#C9963A]/40"
      : "group-hover:ring-[#1B8FA0]/40";

  const cardClass = [
    "group relative flex flex-col rounded-3xl overflow-hidden text-left w-full",
    "bg-[rgba(20,20,24,0.6)] backdrop-blur-2xl border border-white/8",
    "transition-all duration-500 ease-apple",
    "hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl",
    "ring-1 ring-transparent",
    accentRing,
  ].join(" ");

  // Day 9.1 — B2B cards (with salesSource) render as a <button> that opens
  // the contact modal. Consumer cards keep their <a href="/Studio">.
  // Previously both used <a href="mailto:..."> which silently failed in
  // browsers without a configured mail client.
  const Wrapper = salesSource ? "button" : "a";
  const wrapperProps = salesSource
    ? { type: "button", onClick: () => onOpenSales(salesSource) }
    : { href };

  return (
    <Wrapper {...wrapperProps} className={cardClass}>
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
        <img
          src={image}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-apple group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
        />
        {/* Icon badge — top-left over the image */}
        <div
          className={[
            "absolute top-5 left-5 w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md",
            accentBg,
          ].join(" ")}
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-7 sm:p-8 flex-1">
        <EyebrowText color={accent}>{eyebrow}</EyebrowText>
        <h3 className="text-[20px] sm:text-[22px] font-bold leading-tight text-white">{title}</h3>
        <p className="text-caption sm:text-body text-white/55 leading-relaxed">{body}</p>

        {examples && (
          <p className="text-[11px] uppercase tracking-wider text-white/30 mt-1">
            {examples}
          </p>
        )}

        <div className="mt-auto pt-5 flex items-center gap-2 text-caption font-semibold text-white/60 group-hover:text-white transition-colors">
          <span>{cta}</span>
          <ArrowUpRight
            className="w-3.5 h-3.5 transition-transform duration-300 ease-apple group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={2.5}
          />
        </div>
      </div>
    </Wrapper>
  );
}

export default function UseCases() {
  const businessSegments = SEGMENTS.filter((s) => s.salesSource);
  const consumerSegments = SEGMENTS.filter((s) => !s.salesSource);

  // Day 9.1 — modal state for the B2B "Talk to sales" form. Shared by both
  // B2B cards; we pass through which one was clicked so the lead is
  // attributed correctly + we render a tailored title/subtitle.
  const [salesModal, setSalesModal] = useState({ open: false, source: null });
  const openSales = (source) => setSalesModal({ open: true, source });
  const closeSales = () => setSalesModal({ open: false, source: salesModal.source });
  const activeSegment = SEGMENTS.find((s) => s.salesSource === salesModal.source);

  return (
    <section
      id="use-cases"
      className="relative py-24 sm:py-section-mobile lg:py-section"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <MotionSection className="max-w-2xl mb-16 sm:mb-20">
          <EyebrowText>Use cases</EyebrowText>
          <div className="mt-5">
            <DisplayHeading size="lg" as="h2">
              Built for businesses and the people who live in spaces.
            </DisplayHeading>
          </div>
          <p className="mt-6 text-body-lg text-white/55 max-w-xl leading-relaxed">
            Whether you're a real-estate platform staging thousands of listings,
            an e-commerce retailer letting shoppers preview furniture, or someone
            moving into a new place — Ambient Space turns a photo into a designed
            room in seconds.
          </p>
        </MotionSection>

        {/* Business row — heavier visual weight, leads the section */}
        <MotionSection stagger className="mb-12 sm:mb-16">
          <MotionSection.Item>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-eyebrow uppercase text-accent-teal-light">For businesses</span>
              <span className="flex-1 h-px bg-gradient-to-r from-[#1B8FA0]/40 to-transparent" />
            </div>
          </MotionSection.Item>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {businessSegments.map((s) => (
              <MotionSection.Item key={s.eyebrow}>
                <SegmentCard {...s} onOpenSales={openSales} />
              </MotionSection.Item>
            ))}
          </div>
        </MotionSection>

        {/* Consumer row */}
        <MotionSection stagger>
          <MotionSection.Item>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-eyebrow uppercase text-[#D4A857]">For everyday use</span>
              <span className="flex-1 h-px bg-gradient-to-r from-[#C9963A]/40 to-transparent" />
            </div>
          </MotionSection.Item>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {consumerSegments.map((s) => (
              <MotionSection.Item key={s.eyebrow}>
                <SegmentCard {...s} onOpenSales={openSales} />
              </MotionSection.Item>
            ))}
          </div>
        </MotionSection>
      </div>

      {/* Day 9.1 — Talk to sales modal. Shared by both B2B cards; the source
          attribution + tailored copy are derived from whichever card the
          user clicked. */}
      <ContactSalesModal
        open={salesModal.open}
        onClose={closeSales}
        source={salesModal.source || "other"}
        title={activeSegment?.salesTitle || "Talk to sales"}
        subtitle={activeSegment?.salesSubtitle || "Tell us about your use case — we'll get back within one business day."}
        accentColor={activeSegment?.accent === "gold" ? "#C9963A" : "#1B8FA0"}
      />
    </section>
  );
}
