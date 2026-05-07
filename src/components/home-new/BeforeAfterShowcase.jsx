import { useEffect, useRef, useState } from "react";
import { DisplayHeading, EyebrowText, MotionSection } from "@/components/ds";

/**
 * BeforeAfterShowcase — full-bleed dark section with an auto-animating
 * before/after slider. The clip-path of the "after" image animates from 0% to
 * 100% on a 5-second loop, pauses at each end for a beat, then reverses.
 *
 * The user can also drag/click the slider manually — auto-play pauses on
 * interaction and resumes after 4 seconds of idle.
 *
 * Two image URLs come from Unsplash (one empty/uninspired room, one styled).
 * For launch we'll swap these for actual app-generated before/after pairs.
 */

const BEFORE_IMG =
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=85";
const AFTER_IMG =
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=85";

export default function BeforeAfterShowcase() {
  const [position, setPosition] = useState(50);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const directionRef = useRef(1); // 1 = moving right, -1 = moving left
  const idleTimeoutRef = useRef(null);

  // Auto-play loop. Smoothly oscillates the slider position 5%→95%→5%.
  useEffect(() => {
    if (isPaused || isDragging) return;
    let rafId;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000; // seconds since last frame
      last = now;
      setPosition((prev) => {
        const speed = 30; // % per second
        let next = prev + directionRef.current * speed * dt;
        if (next >= 95) {
          next = 95;
          directionRef.current = -1;
        } else if (next <= 5) {
          next = 5;
          directionRef.current = 1;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused, isDragging]);

  // After user releases, resume auto-play in 4 seconds.
  const resumeAutoPlayLater = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => setIsPaused(false), 4000);
  };

  const updateFromClientX = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, pct)));
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setIsPaused(true);
    updateFromClientX(e.clientX);
  };
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  };
  const handlePointerUp = () => {
    setIsDragging(false);
    resumeAutoPlayLater();
  };

  // Cleanup any pending idle timer on unmount.
  useEffect(
    () => () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    },
    []
  );

  return (
    <section className="relative py-24 sm:py-section-mobile lg:py-section">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <MotionSection className="max-w-3xl mb-12 sm:mb-16">
          <EyebrowText color="gold">See it in action</EyebrowText>
          <div className="mt-5">
            <DisplayHeading size="lg" as="h2">
              From bland to magazine-cover in 30 seconds.
            </DisplayHeading>
          </div>
          <p className="mt-6 text-body-lg text-white/55 max-w-2xl leading-relaxed">
            Drag the slider, or just watch. Real renders. Real furniture you can actually buy.
          </p>
        </MotionSection>

        <MotionSection>
          <div
            ref={containerRef}
            className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden cursor-ew-resize select-none border border-white/8 shadow-2xl"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              if (isDragging) {
                setIsDragging(false);
                resumeAutoPlayLater();
              }
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => {
              if (!isDragging) resumeAutoPlayLater();
            }}
          >
            {/* AFTER image (full layer) */}
            <img
              src={AFTER_IMG}
              alt="Redesigned room — Japandi style"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
            {/* BEFORE image (clipped from the right) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ width: `${position}%` }}
            >
              <img
                src={BEFORE_IMG}
                alt="Empty room before AI redesign"
                className="absolute inset-0 h-full object-cover pointer-events-none"
                style={{ width: containerRef.current?.offsetWidth ?? "100%" }}
                draggable={false}
              />
            </div>

            {/* Vertical slider line + handle */}
            <div
              className="absolute top-0 bottom-0 w-px bg-white pointer-events-none"
              style={{
                left: `${position}%`,
                transform: "translateX(-50%)",
                boxShadow: "0 0 24px rgba(255,255,255,0.6)",
              }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-2xl flex items-center justify-center">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0A0A0B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
                </svg>
              </div>
            </div>

            {/* Labels — fade in/out based on slider position so they don't overlap */}
            <span
              className="absolute top-4 left-4 sm:top-6 sm:left-6 text-eyebrow uppercase px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white/80 transition-opacity duration-500"
              style={{ opacity: position > 15 ? 1 : 0 }}
            >
              Before
            </span>
            <span
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-eyebrow uppercase px-3 py-1.5 rounded-full backdrop-blur-md text-white transition-opacity duration-500"
              style={{
                opacity: position < 85 ? 1 : 0,
                background: "rgba(27,143,160,0.8)",
              }}
            >
              After ✦
            </span>
          </div>
        </MotionSection>
      </div>
    </section>
  );
}
