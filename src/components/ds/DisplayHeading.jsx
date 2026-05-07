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
const SIZE = {
  // Hero headline — fills 90% of the viewport width on desktop, then
  // gracefully steps down on tablet and mobile.
  xl: "text-4xl sm:text-6xl md:text-display md:!leading-[1.05] lg:text-display-xl lg:!leading-[1.0]",
  // Section headline.
  lg: "text-3xl sm:text-5xl md:text-display md:!leading-[1.05]",
  // Subsection headline.
  md: "text-2xl sm:text-4xl md:text-headline",
  // Card / sub-block headline.
  sm: "text-xl sm:text-2xl md:text-title",
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
