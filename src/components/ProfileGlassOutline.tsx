import { motion, useTransform, type MotionValue } from "framer-motion";
import { useId, useSyncExternalStore } from "react";
import { useTheme } from "../home/HomeThemeProvider";
import { glassRestingBrightness } from "./capsuleMotion";

const subscribe = () => () => {};
const getServerSnapshot = () => false;

// Keep the side shadows and inner highlights separate to avoid a gray rim.
const darkEdgeStops = Array.from({ length: 17 }, (_, index) => {
  const offset = index / 16;
  return {
    offset,
    end: false,
    shadow: (4 * offset * (1 - offset)) ** 6,
    highlight: Math.abs(2 * offset - 1) ** 3,
  };
}).flatMap((stop) =>
  stop.offset === 0.5 ? [stop, { ...stop, end: true }] : [stop],
);

function EdgeStop({
  offset,
  end = false,
  capFraction,
  ...props
}: {
  offset: number;
  end?: boolean;
  capFraction: number | MotionValue<number>;
  stopColor: string;
  stopOpacity: string;
}) {
  const position = useTransform(() => {
    const fraction =
      typeof capFraction === "number" ? capFraction : capFraction.get();
    const cap = Math.max(0, Math.min(0.5, fraction));
    return offset < 0.5 || (offset === 0.5 && !end)
      ? offset * 2 * cap
      : 1 - (1 - offset) * 2 * cap;
  });
  return (
    <motion.stop
      data-profile-glass-edge-offset={offset}
      data-profile-glass-edge-end={end ? "" : undefined}
      offset={position}
      {...props}
    />
  );
}

export default function ProfileGlassOutline({
  path,
  viewBox,
  clipId: rimClipId,
  capFraction = 0.5,
  radius,
}: {
  path?: string | MotionValue<string>;
  viewBox?: string | MotionValue<string>;
  clipId: string;
  capFraction?: number | MotionValue<number>;
  radius?: number;
}) {
  const Shape = radius === undefined ? motion.path : motion.rect;
  const geometry =
    radius === undefined
      ? { d: path ?? "" }
      : {
          x: 1,
          y: 1,
          rx: radius,
          style: {
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
          },
        };
  const borderGradientId = useId();
  const rimGradientId = useId();
  const borderMaskId = useId();
  // Keep the centered stroke inside the filtered SVG's viewport. WebKit can
  // clip filter output at that viewport even with overflow: visible.
  const paddedViewBox = useTransform(() => {
    const box = typeof viewBox === "string" ? viewBox : viewBox?.get();
    if (!box) return "0 0 0 0";
    const [x, y, width, height] = box.split(/\s+/).map(Number);
    return `${x - 1} ${y - 1} ${width + 2} ${height + 2}`;
  });
  const { resolvedTheme } = useTheme();
  const dark = useSyncExternalStore(
    subscribe,
    () => resolvedTheme === "dark",
    getServerSnapshot,
  );

  return (
    <motion.svg
      data-profile-glass-outline
      data-profile-glass-native-outline={radius === undefined ? undefined : ""}
      style={{
        filter: `brightness(var(--glass-press-brightness, ${glassRestingBrightness})) blur(var(--composer-reveal-blur, 0px))`,
      }}
      aria-hidden="true"
      viewBox={radius === undefined ? paddedViewBox : undefined}
      preserveAspectRatio="none"
      suppressHydrationWarning
      className="pointer-events-none absolute -inset-px z-40 h-[calc(100%+2px)] w-[calc(100%+2px)] overflow-visible"
    >
      <defs>
        <mask id={borderMaskId} style={{ maskType: "luminance" }}>
          <rect x="-10%" y="-10%" width="120%" height="120%" fill="#fff" />
          <Shape
            data-profile-glass-border-mask
            {...geometry}
            suppressHydrationWarning
            fill="#000"
          />
        </mask>
        <clipPath id={rimClipId} clipPathUnits="userSpaceOnUse">
          <Shape
            data-profile-glass-rim-clip
            {...geometry}
            suppressHydrationWarning
          />
        </clipPath>
        <linearGradient id={borderGradientId} x1="0" y1="0" x2="0" y2="1">
          {dark ? (
            darkEdgeStops.map(({ offset, end, shadow }, index) => (
              <EdgeStop
                key={index}
                offset={offset}
                end={end}
                capFraction={capFraction}
                stopColor="#000"
                stopOpacity={`calc(var(--home-glass-border-side-opacity, 0.65) * ${shadow})`}
              />
            ))
          ) : (
            <>
              <EdgeStop
                offset={0}
                capFraction={capFraction}
                stopColor="var(--home-glass-border, #000)"
                stopOpacity="var(--home-glass-border-top-opacity, 0.12)"
              />
              <EdgeStop
                offset={0.25}
                capFraction={capFraction}
                stopColor="var(--home-glass-border, #000)"
                stopOpacity="var(--home-glass-border-upper-opacity, 0.12)"
              />
              <EdgeStop
                offset={0.5}
                capFraction={capFraction}
                stopColor="var(--home-glass-border-side-color, var(--home-glass-border, #000))"
                stopOpacity="var(--home-glass-border-side-opacity, 0.12)"
              />
              <EdgeStop
                offset={0.5}
                end
                capFraction={capFraction}
                stopColor="var(--home-glass-border-side-color, var(--home-glass-border, #000))"
                stopOpacity="var(--home-glass-border-side-opacity, 0.12)"
              />
              <EdgeStop
                offset={0.75}
                capFraction={capFraction}
                stopColor="var(--home-glass-border, #000)"
                stopOpacity="var(--home-glass-border-lower-opacity, 0.12)"
              />
              <EdgeStop
                offset={1}
                capFraction={capFraction}
                stopColor="var(--home-glass-border, #000)"
                stopOpacity="var(--home-glass-border-bottom-opacity, 0.12)"
              />
            </>
          )}
        </linearGradient>
        <linearGradient id={rimGradientId} x1="0" y1="0" x2="0" y2="1">
          {dark ? (
            darkEdgeStops.map(({ offset, end, highlight }, index) => (
              <EdgeStop
                key={index}
                offset={offset}
                end={end}
                capFraction={capFraction}
                stopColor="#fff"
                stopOpacity={`calc(var(--home-glass-rim-top-opacity, 0.22) * ${highlight})`}
              />
            ))
          ) : (
            <>
              <EdgeStop
                offset={0}
                capFraction={capFraction}
                stopColor="#fff"
                stopOpacity="var(--home-glass-rim-top-opacity, 1)"
              />
              <EdgeStop
                offset={0.5}
                capFraction={capFraction}
                stopColor="#fff"
                stopOpacity="0"
              />
              <EdgeStop
                offset={0.5}
                end
                capFraction={capFraction}
                stopColor="#fff"
                stopOpacity="0"
              />
              <EdgeStop
                offset={1}
                capFraction={capFraction}
                stopColor="#fff"
                stopOpacity="var(--home-glass-rim-bottom-opacity, 1)"
              />
            </>
          )}
        </linearGradient>
      </defs>
      <Shape
        data-profile-glass-rim
        {...geometry}
        suppressHydrationWarning
        fill="none"
        stroke={`url(#${rimGradientId})`}
        strokeWidth={1.5}
        clipPath={`url(#${rimClipId})`}
        style={{
          ...geometry.style,
          opacity: "var(--home-glass-rim-opacity, 0)",
        }}
      />
      <Shape
        data-profile-glass-border
        mask={dark ? `url(#${borderMaskId})` : undefined}
        {...geometry}
        suppressHydrationWarning
        fill="none"
        stroke={`url(#${borderGradientId})`}
        strokeWidth={0.5}
      />
    </motion.svg>
  );
}
