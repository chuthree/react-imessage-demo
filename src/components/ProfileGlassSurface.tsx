import { Glass } from "@samasante/liquid-glass";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { useTheme } from "../home/HomeThemeProvider";
import { cn } from "cn";
import { generateClipPath, generatePath } from "@lisse/core/path";
import {
  useId,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type CSSProperties,
} from "react";
const cornerSmoothing = 0.6;
import {
  capsulePressMotion,
  capsuleReducedPressMotion,
  glassPressMotion,
  glassRestingBrightness,
} from "./capsuleMotion";
import useSurfaceSize from "./useSurfaceSize";
import { useGlassOptics } from "./useGlassOptics";
import ProfileGlassOutline from "./ProfileGlassOutline";

const subscribe = () => () => {};
const getServerSnapshot = () => false;

// The profile capsule and conversation controls share one glass material.
export default function ProfileGlassSurface({
  children,
  className,
  radius = 20,
  smoothing = cornerSmoothing,
  size,
  material = "clear",
  materialProgress = 1,
  animateHeight = false,
}: {
  children: ReactNode;
  className?: string;
  radius?: number;
  smoothing?: number;
  size?: { width: number; height: number };
  material?: "clear" | "frosted";
  materialProgress?: number;
  animateHeight?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const rimClipId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const measuredSize = useSurfaceSize(surfaceRef, false, !size);
  const contentSize = useSurfaceSize(contentRef, false, animateHeight);
  const heightValue = useMotionValue(40);
  const [animatedHeight, setAnimatedHeight] = useState(40);
  const { width, height } =
    size ??
    (animateHeight
      ? { width: measuredSize.width, height: animatedHeight }
      : measuredSize);
  const pressMotion = reduceMotion
    ? capsuleReducedPressMotion
    : capsulePressMotion(width, height);
  const restingHeight = animateHeight ? 0 : measuredSize.height;
  if (!animateHeight && animatedHeight !== restingHeight)
    setAnimatedHeight(restingHeight);

  useEffect(() => {
    if (!animateHeight) {
      heightValue.set(restingHeight);
      return;
    }
    if (!contentSize.height || heightValue.get() === contentSize.height) return;
    let animation: { stop: () => void } | undefined;
    const startFrame = requestAnimationFrame(() => {
      animation = animate(heightValue, contentSize.height, {
        duration: reduceMotion ? 0 : 0.24,
        ease: [0.23, 1, 0.32, 1],
        // Geometry and refraction share the same state update.
        onUpdate: setAnimatedHeight,
      });
    });
    return () => {
      cancelAnimationFrame(startFrame);
      animation?.stop();
    };
  }, [
    animateHeight,
    contentSize.height,
    restingHeight,
    heightValue,
    reduceMotion,
  ]);
  const corners = {
    radius,
    smoothing,
    preserveSmoothing: true,
  };
  const clipPath =
    width && height ? generateClipPath(width, height, corners) : undefined;
  const borderPath =
    width && height ? generatePath(width, height, corners) : undefined;
  // Limit lighting changes to the rounded caps; straight sides stay uniform.
  // Animated height starts at 40 before width is measured. Keep the initial
  // cap fallback until both dimensions exist, rather than collapsing to zero.
  const capFraction =
    width && height
      ? Math.min(
          (Math.min(radius, width / 2, height / 2) * (1 + smoothing)) / height,
          0.5,
        )
      : 0.5;
  const [optics, canRefract] = useGlassOptics();
  const { resolvedTheme } = useTheme();
  // The provider updates theme changes; hydration must match the server's veil.
  const dark = useSyncExternalStore(
    subscribe,
    () => resolvedTheme === "dark",
    getServerSnapshot,
  );
  const glassMotion = glassPressMotion(dark);
  const profileOptics = canRefract
    ? {
        ...optics,
        strength: 0.22,
        depth: 0.2,
        curvature: 0,
        bend: 1,
        bendWidth: 0.25,
        dispersion: 1,
        brightness: 0.08,
      }
    : optics;
  const density =
    material === "frosted" ? Math.max(0, Math.min(1, materialProgress)) : 0;

  const surfaceClassName = cn("relative isolate inline-block", className);
  const highlightClassName =
    "pointer-events-none absolute inset-0 z-30 [mix-blend-mode:var(--home-glass-highlight-blend,plus-lighter)] [box-shadow:var(--home-glass-highlight-shadow,inset_0_var(--segmented-highlight-offset,.0875rem)_.03125rem_-.03125rem_rgba(255,255,255,var(--segmented-highlight-opacity,.28)),inset_0_calc(0rem_-_var(--segmented-highlight-offset,.0875rem))_.03125rem_-.03125rem_rgba(255,255,255,var(--segmented-highlight-opacity,.28)))]";
  const content = (
    <>
      <span
        aria-hidden="true"
        style={{
          backgroundImage:
            "var(--home-glass-fill, linear-gradient(to bottom, var(--tw-gradient-stops)))",
        }}
        className="pointer-events-none absolute inset-0 z-0 bg-linear-to-b from-[rgb(var(--home-glass-tint,250_250_250)/var(--home-glass-edge-opacity,0.85))] via-[rgb(var(--home-glass-tint,255_255_255)/var(--home-glass-center-opacity,0.55))] to-[rgb(var(--home-glass-tint,250_250_250)/var(--home-glass-edge-opacity,0.85))]"
      />
      {material === "frosted" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundColor: dark ? "#202022" : "#f5f5f7",
            opacity: 0.45 * density,
          }}
        />
      )}
      <span
        ref={contentRef}
        className={cn(
          "z-10 block",
          animateHeight ? "absolute inset-x-0 bottom-0" : "relative",
          size && "h-full",
        )}
      >
        {children}
      </span>
      <span aria-hidden="true" className={highlightClassName} />
    </>
  );

  return (
    <>
      <motion.div
        ref={surfaceRef}
        data-profile-glass-radius={radius}
        data-profile-glass-smoothing={smoothing}
        initial={false}
        animate={{
          scale: 1,
          opacity: 1,
          ...(!size ? glassMotion.animate : {}),
        }}
        whileTap={
          size
            ? undefined
            : {
                ...pressMotion.whileTap,
                ...glassMotion.whileTap,
              }
        }
        transition={{
          ...pressMotion.transition,
          ...glassMotion.transition,
        }}
        tabIndex={-1}
        suppressHydrationWarning
        className={surfaceClassName}
        style={
          {
            borderRadius: radius,
            width: size?.width,
            height: size?.height ?? (animateHeight ? height : undefined),
            boxShadow: "var(--home-glass-shadow, none)",
            "--profile-glass-radius": clipPath ? "0px" : `${radius}px`,
            "--profile-glass-clip": clipPath,
          } as CSSProperties
        }
      >
        <Glass
          data-profile-glass-material
          radius={radius}
          width={
            size?.width ?? (animateHeight ? width || undefined : undefined)
          }
          height={size?.height ?? (animateHeight ? height : undefined)}
          optics={{
            ...profileOptics,
            ...(size || animateHeight ? { mapSize: 128 } : {}),
            frost:
              profileOptics.frost * (1 - density) +
              (canRefract ? 10 : 24) * density,
            // A dark veil attenuates bright content behind the lens,
            // while the foreground and edge highlights stay clear.
            ...(dark ? { brightness: -0.32 } : {}),
          }}
          style={{
            // Keep the filter on the backdrop owner, not its ancestor.
            filter: `brightness(var(--glass-press-brightness, ${glassRestingBrightness})) blur(var(--composer-reveal-blur, 0px))`,
            // Circular capsules follow the live CSS box, including
            // the first animation frame before measurement catches up.
            borderRadius:
              smoothing === 0 ? radius : "var(--profile-glass-radius)",
            clipPath:
              smoothing === 0
                ? `inset(0 round ${radius}px)`
                : "var(--profile-glass-clip, none)",
          }}
          className={cn(
            "relative isolate block! w-full!",
            smoothing !== 0 && "rounded-(--profile-glass-radius)!",
            size || animateHeight ? "overflow-clip" : "overflow-hidden",
          )}
        >
          {content}
        </Glass>

        <ProfileGlassOutline
          radius={smoothing === 0 ? radius : undefined}
          path={borderPath}
          viewBox={width && height ? `0 0 ${width} ${height}` : undefined}
          clipId={rimClipId}
          capFraction={capFraction}
        />
      </motion.div>
    </>
  );
}
