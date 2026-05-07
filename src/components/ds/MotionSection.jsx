import { motion } from "framer-motion";

/**
 * MotionSection — a viewport-aware section that fades in and rises 24px as it
 * enters view. Replaces 90% of the ad-hoc framer-motion blocks we'd otherwise
 * scatter across pages.
 *
 *   <MotionSection>
 *     <DisplayHeading>...</DisplayHeading>
 *   </MotionSection>
 *
 *   // Stagger child reveals:
 *   <MotionSection stagger>
 *     <MotionSection.Item>...</MotionSection.Item>
 *     <MotionSection.Item>...</MotionSection.Item>
 *   </MotionSection>
 *
 * Animation curve is the Apple ease — gentle ease-out, never overshoots, never
 * runs longer than 600ms. Triggers once per element and stays settled.
 */
const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const STAGGER_PARENT = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const STAGGER_CHILD = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

function MotionSection({
  as: Tag = "section",
  stagger = false,
  className = "",
  children,
  ...rest
}) {
  const Component = motion[Tag] ?? motion.section;
  return (
    <Component
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={stagger ? STAGGER_PARENT : SECTION_VARIANTS}
      className={className}
      {...rest}
    >
      {children}
    </Component>
  );
}

function Item({ as: Tag = "div", className = "", children, ...rest }) {
  const Component = motion[Tag] ?? motion.div;
  return (
    <Component variants={STAGGER_CHILD} className={className} {...rest}>
      {children}
    </Component>
  );
}

MotionSection.Item = Item;

export default MotionSection;
