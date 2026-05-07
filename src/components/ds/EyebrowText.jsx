/**
 * EyebrowText — small uppercase tracked label that sits above headlines.
 *
 *   <EyebrowText>AI-Powered Interior Design</EyebrowText>
 *
 * Renders all-caps with letter-spacing and a thin teal underline accent that
 * makes it feel intentional instead of generic. Pair with a DisplayHeading
 * directly below for the canonical "section start" pattern.
 */
export default function EyebrowText({
  children,
  color = "teal",
  className = "",
  ...rest
}) {
  const colorClass =
    color === "gold" ? "text-[#C9963A]" : "text-[#6EC6C6]";

  return (
    <div
      className={[
        "inline-flex items-center gap-2 text-eyebrow uppercase",
        colorClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={[
          "h-px w-6",
          color === "gold" ? "bg-[#C9963A]" : "bg-[#6EC6C6]",
        ].join(" ")}
      />
      <span>{children}</span>
    </div>
  );
}
