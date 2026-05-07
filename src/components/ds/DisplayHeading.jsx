/**
 * DisplayHeading — large, tightly-tracked headline. The visual heart of every
 * Apple-style section.
 *
 *   <DisplayHeading>Redesign your space in minutes.</DisplayHeading>
 *   <DisplayHeading size="md">How it works</DisplayHeading>
 *
 * Sizes shrink at smaller breakpoints automatically — `xl` becomes `display`
 * on mobile so it never overflows.
 */
// Sizes capped to be legible. The previous 96px hero size produced ugly line
// breaks at common laptop widths — 72px keeps the headline 1-2 lines max.
const SIZE = {
  // Hero headline — uses `text-balance` so the browser distributes the
  // line break intelligently instead of orphaning a single word on its own
  // line. Caps at 72px desktop, scales down cleanly for smaller screens.
  xl: "text-[44px] leading-[1.05] sm:text-[56px] sm:leading-[1.05] lg:text-[72px] lg:leading-[1.02] [text-wrap:balance]",
  // Section headline.
  lg: "text-[36px] leading-[1.1] sm:text-[44px] sm:leading-[1.08] lg:text-[56px] lg:leading-[1.05] [text-wrap:balance]",
  // Subsection headline.
  md: "text-[28px] leading-[1.15] sm:text-[36px] sm:leading-[1.12] lg:text-headline [text-wrap:balance]",
  // Card / sub-block headline.
  sm: "text-[22px] leading-[1.2] sm:text-[26px] lg:text-title [text-wrap:balance]",
};

export default function DisplayHeading({
  children,
  as: Tag = "h1",
  size = "xl",
  gradient = false,
  className = "",
  ...rest
}) {
  return (
    <Tag
      className={[
        "font-extrabold tracking-tight text-white",
        SIZE[size] ?? SIZE.xl,
        gradient
          ? "bg-clip-text text-transparent bg-[linear-gradient(135deg,#ffffff_0%,#6EC6C6_55%,#C9963A_100%)]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
