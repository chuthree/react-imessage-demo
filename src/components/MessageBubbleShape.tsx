import { useId, useRef, type CSSProperties } from "react";
import { cn } from "cn";
import useSurfaceSize from "./useSurfaceSize";
import bubblePath from "./messageBubblePath";

export const messageBubbleFrame =
  "group/bubble relative isolate h-auto min-h-10 min-w-12 shrink-0";

export default function MessageBubbleShape({
  tail = false,
  outgoing = false,
  bordered = false,
  showFocusRing = true,
  radius = 20,
}: {
  tail?: boolean;
  outgoing?: boolean;
  bordered?: boolean;
  showFocusRing?: boolean;
  radius?: 18 | 20 | 24;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { width, height } = useSurfaceSize(svgRef);
  const path = width && height ? bubblePath(width, height, radius, tail) : null;
  const id = useId();
  const gradientId = `${id}-gradient`;
  const focusId = `${id}-focus`;

  return (
    <svg
      ref={svgRef}
      data-bubble-radius={radius}
      data-bubble-tail={tail ? "" : undefined}
      data-bubble-ready={path ? "" : undefined}
      suppressHydrationWarning
      // Keep the measured path fitted while ResizeObserver catches up
      // with a content change, before layout projection scales the SVG.
      viewBox={path ? `0 0 ${width} ${height}` : undefined}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      overflow="visible"
      className={cn(
        "group/bubble-shape pointer-events-none absolute inset-0 -z-10 size-full overflow-visible",
        outgoing && "-scale-x-100",
      )}
      style={
        {
          // Use the content-driven layout height rather than an SVG
          // percentage height inside an auto-height, min-height box.
          height: height || undefined,
          "--bubble-focus-filter": `url(#${focusId})`,
        } as CSSProperties
      }
    >
      <defs>
        {outgoing ? (
          <linearGradient
            id={gradientId}
            x2="0"
            y2="100%"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--message-blue-top, #2fa4fb)" />
            <stop offset="1" stopColor="var(--message-blue-bottom, #2fa4fb)" />
          </linearGradient>
        ) : null}
        <filter
          id={focusId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius={2}
            result="outline"
          />
          <feFlood floodColor="var(--message-focus-color, #007aff)" />
          <feComposite in2="outline" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        className={cn(
          showFocusRing &&
            "group-focus-visible/bubble:[filter:var(--bubble-focus-filter)] group-has-focus-visible/bubble:[filter:var(--bubble-focus-filter)]",
        )}
      >
        <path
          data-bubble-path
          d={path ?? ""}
          stroke={bordered ? "var(--message-border, #cecece)" : undefined}
          strokeWidth={bordered ? 2 : undefined}
          paintOrder="stroke fill"
          strokeLinejoin="round"
          suppressHydrationWarning
          fill={
            outgoing
              ? `url(#${gradientId})`
              : "var(--bubble-fill, var(--message-incoming-bg, #e9e9ea))"
          }
        />
        <g className="group-data-[bubble-ready]/bubble-shape:hidden">
          <rect
            width="100%"
            height="100%"
            rx={radius}
            stroke={bordered ? "var(--message-border, #cecece)" : undefined}
            strokeWidth={bordered ? 2 : undefined}
            paintOrder="stroke fill"
            fill={
              outgoing
                ? `url(#${gradientId})`
                : "var(--bubble-fill, var(--message-incoming-bg, #e9e9ea))"
            }
          />
          {tail && (
            // SSR has no dimensions; the minimum contour
            // supplies its tail until the measured path is ready.
            <svg
              x="0"
              y="100%"
              width="48"
              height="7"
              viewBox="0 40 48 7"
              overflow="visible"
            >
              <path
                d={bubblePath(48, 40, radius, true)}
                stroke={bordered ? "var(--message-border, #cecece)" : undefined}
                strokeWidth={bordered ? 2 : undefined}
                paintOrder="stroke fill"
                strokeLinejoin="round"
                fill={
                  outgoing
                    ? "var(--message-blue-bottom, #2fa4fb)"
                    : "var(--bubble-fill, var(--message-incoming-bg, #e9e9ea))"
                }
              />
            </svg>
          )}
        </g>
      </g>
    </svg>
  );
}
