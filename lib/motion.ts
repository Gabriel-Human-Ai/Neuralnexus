export const MOTION = {
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  spring: { type: "spring", stiffness: 350, damping: 30 },
  springSoft: { type: "spring", stiffness: 220, damping: 28 },
  easeOut: [0.22, 1, 0.36, 1],
  easeIn: [0.4, 0, 1, 1],
  stagger: 0.045,
  draw: 0.5,
  flare: 0.6,
  rise: 12,
  lift: 2,
} as const;

export const viewMotion = {
  initial: { opacity: 0, y: MOTION.rise, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: 6, filter: "blur(0px)" },
  transition: { duration: MOTION.base, ease: MOTION.easeOut },
} as const;
