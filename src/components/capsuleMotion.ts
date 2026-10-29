// Shared by glass controls and the mobile message composer.
export const glassRestingBrightness = 1.02;

export const glassPressMotion = (dark: boolean) =>
  ({
    animate: { "--glass-press-brightness": glassRestingBrightness },
    whileTap: { "--glass-press-brightness": dark ? 1.5 : 1.1 },
    transition: {
      "--glass-press-brightness": {
        duration: 0.1,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  }) as const;

export const capsulePressMotion = (width: number, height: number) =>
  ({
    whileTap: { scale: 1 + 16 / Math.max(width, height, 40) },
    transition: {
      type: "spring",
      stiffness: 320,
      damping: 30,
      mass: 1,
    },
  }) as const;

export const capsuleReducedPressMotion = {
  whileTap: { opacity: 0.8 },
  transition: { duration: 0.16 },
} as const;
