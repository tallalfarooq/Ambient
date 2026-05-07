import { forwardRef } from "react";

/**
 * GlassCard — the building block for surfaces in the redesigned UI.
 *
 * Creates a frosted-glass panel with a thin 1px border and optional hover-lift.
 * Layout patterns we use repeatedly:
 *
 *   <GlassCard>...</GlassCard>                       // default
 *   <GlassCard hover>...</GlassCard>                 // lifts 4px on hover
 *   <GlassCard accent="teal">...</GlassCard>         // teal-tinted border
 *   <GlassCard accent="gold">...</GlassCard>         // gold-tinted border
 *   <GlassCard padding="lg">...</GlassCard>          // bigger inner padding
 *   <GlassCard as="article">...</GlassCard>          // override the tag
 *
 * Browsers without backdrop-filter (older Firefox) gracefully degrade to a
 * solid translucent background — still legible, just less cinematic.
 */
const PADDING = {
  none: "",
  sm: "p-4 sm:p-5",
  md: "p-6 sm:p-7",
  lg: "p-8 sm:p-10",
  xl: "p-10 sm:p-14",
};

const ACCENT_BORDER = {
  none: "border-white/8",
  teal: "border-[rgba(27,143,160,0.35)]",
  gold: "border-[rgba(201,150,58,0.35)]",
};

const GlassCard = forwardRef(function GlassCard(
  {
    children,
    as: Tag = "div",
    padding = "md",
    accent = "none",
    hover = false,
    className = "",
    style,
    ...rest
  },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={[
        "relative rounded-3xl border backdrop-blur-2xl transition-all duration-500 ease-apple",
        "bg-[rgba(20,20,24,0.6)]",
        ACCENT_BORDER[accent] ?? ACCENT_BORDER.none,
        PADDING[padding] ?? PADDING.md,
        hover ? "hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default GlassCard;
