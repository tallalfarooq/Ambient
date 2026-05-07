import { forwardRef } from "react";
import { Link } from "react-router-dom";

/**
 * GradientButton — primary CTA button for the redesign.
 *
 * Three variants:
 *   - "primary"   — teal→gold gradient, white text. The hero CTA.
 *   - "secondary" — glass background, white text. Goes alongside primary.
 *   - "ghost"     — transparent, just text + arrow. For tertiary "Learn more"
 *                   style links.
 *
 * Renders a <Link> when `to` is passed, an <a> when `href` is passed, or a
 * <button> otherwise. Same look across all three to make CTAs consistent.
 */
const SIZE = {
  sm: "px-4 py-2 text-caption rounded-xl",
  md: "px-6 py-3 text-body rounded-2xl",
  lg: "px-8 py-4 text-body-lg rounded-2xl",
};

const VARIANT = {
  primary:
    "text-white shadow-[0_8px_28px_rgba(27,143,160,0.35)] " +
    "bg-[linear-gradient(135deg,#1B8FA0_0%,#C9963A_100%)] " +
    "hover:shadow-[0_12px_36px_rgba(27,143,160,0.5)] hover:brightness-110 " +
    "active:brightness-95",
  secondary:
    "text-white border border-white/15 bg-white/5 backdrop-blur-md " +
    "hover:bg-white/10 hover:border-white/25",
  ghost:
    "text-white/70 hover:text-white",
};

const GradientButton = forwardRef(function GradientButton(
  {
    children,
    to,
    href,
    variant = "primary",
    size = "md",
    icon = null,
    iconPosition = "right",
    className = "",
    ...rest
  },
  ref
) {
  const baseClass = [
    "inline-flex items-center justify-center gap-2 font-semibold",
    "transition-all duration-300 ease-apple will-change-transform",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EC6C6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0B]",
    SIZE[size] ?? SIZE.md,
    VARIANT[variant] ?? VARIANT.primary,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={baseClass} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={baseClass} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} className={baseClass} {...rest}>
      {content}
    </button>
  );
});

export default GradientButton;
