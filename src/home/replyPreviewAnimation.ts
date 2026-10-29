import { animate, type MotionValue } from "framer-motion";

export type ReplyBounds = Pick<DOMRect, "left" | "top">;

export const settledReplyTransform = "translate3d(0px, 0px, 0px)";

// Both boxes are viewport coordinates. Never add document scroll offsets:
// dialog scroll locking can transfer scrolling between html and body.
// Convert viewport distances back to local CSS pixels when the phone is zoomed.
export function replyPreviewTransform(
  origin: ReplyBounds,
  target: ReplyBounds,
  zoom = 1,
) {
  const x = (origin.left - target.left) / zoom;
  const y = (origin.top - target.top) / zoom;
  // A reply moves the message, never stretches it to match a container.
  // Decimal notation also keeps near-zero zoom deltas out of string parsing.
  return `translate3d(${x.toFixed(5)}px, ${y.toFixed(5)}px, 0px)`;
}

// One value owns presentation and interruption, without a parallel native timeline.
export function animateReplyTransform(
  value: MotionValue<string>,
  target: string,
  duration: number,
) {
  return animate(value, target, { duration, ease: [0.32, 0.72, 0, 1] });
}
