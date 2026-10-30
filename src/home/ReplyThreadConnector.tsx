import { useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { useContainedViewportLocked } from "../components/ContainedViewport";
import motion from "./replyConnectorMotion.json";

// Stretch only the straight stem to fit message height; preserve the loop geometry.
function centerline(
  points: number[],
  anchor: number,
  end: number,
  topBend = 0,
) {
  anchor -= topBend;
  end -= topBend;
  const positions: [number, number][] = [];
  let upper = points[1];
  for (let i = 2; i < points.length && Math.abs(points[i] - 16) < 0.01; i += 2)
    upper = points[i + 1];
  const lower = motion.anchor + 12;
  for (let i = 0; i < points.length; i += 2) {
    const y = points[i + 1];
    // Shorten the initial bend for consecutive replies without distorting the final loop.
    const shortBend = upper + anchor - motion.anchor < 2;
    const mappedY =
      shortBend && y <= motion.anchor
        ? 2 + (Math.max(0, y - upper) * (anchor - 2)) / (motion.anchor - upper)
        : y < upper && upper > 2
          ? 2 +
            ((y - 2) * Math.max(0, upper + anchor - motion.anchor - 2)) /
              (upper - 2)
          : y > lower
            ? anchor +
              12 +
              ((y - lower) * Math.max(0, end - anchor - 12)) /
                (motion.end - lower)
            : y + anchor - motion.anchor;
    positions.push([points[i], mappedY + topBend]);
  }
  // Open Catmull–Rom follows the measured trajectory; SVG supplies uniform width/caps.
  const point = (index: number) =>
    positions[Math.max(0, Math.min(positions.length - 1, index))];
  // Keep the original animated lower path intact; the upper return is fixed.
  let d = topBend
    ? `M48 2 C26 2 16 ${2 + topBend / 3} 16 ${2 + topBend}`
    : `M${point(0).join(" ")}`;
  for (let i = 0; i < positions.length - 1; i++) {
    const [a, b, c, e] = [point(i - 1), point(i), point(i + 1), point(i + 2)];
    d += `C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6} ${c.join(" ")}`;
  }
  return d;
}

export default function ReplyThreadConnector({
  connected,
  live,
  continuation = false,
  continuationFrom,
  outgoingQuote = false,
}: {
  connected: boolean;
  live: boolean;
  continuation?: boolean;
  continuationFrom?: string;
  outgoingQuote?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const progress = useRef(connected && !live ? motion.frames.length - 1 : 0);
  const reduced = useReducedMotion();
  const locked = useContainedViewportLocked();

  useLayoutEffect(() => {
    if (locked) return;
    const svg = svgRef.current;
    // Find the parent through the SVG because the parent ref is not attached yet on mount.
    const container = svg?.closest("li");
    const path = pathRef.current;
    const quote = container?.querySelector<HTMLElement>("[data-chat-quote]");
    const preceding = continuationFrom
      ? container
          ?.closest("[data-home-thread]")
          ?.querySelector<HTMLElement>(
            `[data-reply-surface="${CSS.escape(continuationFrom)}"]`,
          )
      : undefined;
    const outgoing = container?.querySelector<HTMLElement>(
      "[data-chat-outgoing]",
    );
    if (!container || !svg || !path || (!quote && !continuation) || !outgoing)
      return;
    const targetMessage =
      [
        ...outgoing.querySelectorAll<HTMLElement>(
          "[data-message-tail], [data-chat-message-part]",
        ),
      ].at(-1) ?? outgoing;
    let anchor = motion.anchor;
    let end = motion.end;
    const topBend = outgoingQuote && !continuation ? 32 : 0;
    const paint = () => {
      const position = Math.max(
        0,
        Math.min(motion.frames.length - 1, progress.current),
      );
      const index = Math.min(motion.frames.length - 2, Math.floor(position));
      const blend = position - index;
      const from = motion.frames[index];
      const to = motion.frames[index + 1];
      const points = from.map((value, i) => value + (to[i] - value) * blend);
      path.setAttribute("d", centerline(points, anchor, end, topBend));
    };
    const measure = () => {
      // Use layout offsets to exclude the phone's CSS zoom.
      const layoutTop = (element: HTMLElement) => {
        let top = 0;
        for (
          let node: HTMLElement | null = element;
          node;
          node = node.offsetParent as HTMLElement | null
        )
          top += node.offsetTop;
        return top;
      };
      const containerTop = layoutTop(container);
      const offsetTop = (element: HTMLElement) =>
        layoutTop(element) - containerTop;
      const top = quote
        ? offsetTop(quote) +
          (topBend ? quote.offsetHeight / 2 - 2 : quote.offsetHeight + 8)
        : preceding
          ? offsetTop(preceding) + preceding.offsetHeight + 8
          : 0;
      const incoming = container.querySelector<HTMLElement>(
        "[data-chat-incoming]",
      );
      anchor = Math.max(
        topBend + 20,
        offsetTop(targetMessage) + targetMessage.offsetHeight / 2 - top,
      );
      end = Math.max(
        anchor + 16,
        incoming
          ? offsetTop(incoming) - top - 8
          : offsetTop(targetMessage) + targetMessage.offsetHeight - top + 20,
      );
      svg.style.top = `${top}px`;
      svg.style.height = `${Math.max(end + 8, anchor + 32)}px`;
      paint();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (preceding) observer.observe(preceding);
    if (preceding && container.parentElement)
      observer.observe(container.parentElement);
    if (quote) observer.observe(quote);
    observer.observe(outgoing);
    if (targetMessage !== outgoing) observer.observe(targetMessage);
    const target = connected ? motion.frames.length - 1 : 0;
    let animation: ReturnType<typeof animate> | undefined;
    if (reduced || !live) {
      progress.current = target;
      paint();
    } else {
      animation = animate(progress.current, target, {
        duration: Math.abs(target - progress.current) / motion.fps,
        ease: "linear",
        onUpdate: (value) => {
          progress.current = value;
          paint();
        },
      });
    }
    return () => {
      observer.disconnect();
      animation?.stop();
    };
  }, [
    connected,
    live,
    continuation,
    continuationFrom,
    outgoingQuote,
    reduced,
    locked,
  ]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 w-16 overflow-visible"
    >
      <path
        ref={pathRef}
        fill="none"
        stroke="var(--message-incoming-bg)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
