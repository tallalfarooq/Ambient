import { motion } from "framer-motion";
import { Sparkles, ShoppingBag } from "lucide-react";

/**
 * HeroVisual — the right-column visual in the Home hero.
 *
 * Replaces the previous 3D-primitives scene. Apple's hero pattern is real
 * product photography, not cartoon geometry. For Ambient Space, the "product"
 * is the AI render + shoppable furniture, so we show that directly:
 *
 *   - Full-bleed real interior photo (from Unsplash, will swap to
 *     app-generated render later)
 *   - "✦ Japandi · AI Render" floating badge top-left, suggesting the
 *     workflow's output
 *   - Two floating product cards that gently bob, demonstrating the
 *     "Detect & Shop" feature without copy
 *   - Subtle teal glow behind the image for depth
 *
 * No WebGL, no jank, photoreal vibe. The whole composition reads as "what
 * you'll get from this app" instead of "look at our toy 3D."
 */

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=85";

// Easing curve mirrors the design-system token (cubic-bezier(0.16, 1, 0.3, 1)).
const APPLE_EASE = [0.16, 1, 0.3, 1];

function StyleBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.4, duration: 0.6, ease: APPLE_EASE }}
      className="absolute top-5 left-5 flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-xl text-caption font-semibold text-white"
      style={{
        background: "rgba(20, 20, 24, 0.7)",
        border: "1px solid rgba(110, 198, 198, 0.35)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
      }}
    >
      <Sparkles className="w-3.5 h-3.5 text-accent-teal-light" strokeWidth={2.5} />
      <span>Japandi · AI Render</span>
    </motion.div>
  );
}

function ProductChip({ delay, top, left, right, bottom, title, price, accent }) {
  const accentStyle =
    accent === "gold"
      ? { borderColor: "rgba(201, 150, 58, 0.4)", iconColor: "#D4A857" }
      : { borderColor: "rgba(110, 198, 198, 0.4)", iconColor: "#6EC6C6" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: APPLE_EASE }}
      className="absolute hidden sm:block"
      style={{ top, left, right, bottom }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: APPLE_EASE, delay: delay + 0.5 }}
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-xl"
        style={{
          background: "rgba(20, 20, 24, 0.85)",
          border: `1px solid ${accentStyle.borderColor}`,
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <ShoppingBag className="w-4 h-4" style={{ color: accentStyle.iconColor }} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">
            Shoppable
          </span>
          <span className="text-caption font-semibold text-white whitespace-nowrap">
            {title}
          </span>
          <span className="text-caption text-white/55">{price}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HeroVisual({ className = "" }) {
  return (
    <div className={["relative", className].join(" ")}>
      {/* Soft ambient glow behind the photo for depth */}
      <div
        aria-hidden
        className="absolute -inset-12 -z-10 blur-3xl opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(27,143,160,0.3), transparent 60%)," +
            "radial-gradient(ellipse at 70% 70%, rgba(201,150,58,0.18), transparent 70%)",
        }}
      />

      {/* The image card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: APPLE_EASE }}
        className="relative aspect-[4/5] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
        style={{
          boxShadow:
            "0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset",
        }}
      >
        <img
          src={HERO_IMAGE}
          alt="AI-redesigned Japandi interior"
          loading="eager"
          className="w-full h-full object-cover"
        />

        {/* Gradient overlay so the bottom area reads against any image */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15 pointer-events-none"
        />

        {/* Floating overlays */}
        <StyleBadge />

        {/* Day 6.4: chips were positioned with negative percentages (-8%, -10%)
            to "float" outside the card. At <1440px viewport widths the right
            chip overflowed the page and got clipped. Pulled both chips inside
            the card boundary while keeping the floating shadow + bob animation
            so they still feel airy. */}
        <ProductChip
          delay={0.7}
          top="35%"
          left="3%"
          title="Walnut Floor Lamp"
          price="$249"
          accent="teal"
        />
        <ProductChip
          delay={0.95}
          bottom="14%"
          right="3%"
          title="Linen Sofa"
          price="$1,299"
          accent="gold"
        />
      </motion.div>
    </div>
  );
}
