import { animate, type MotionValue } from "framer-motion";

export type ReplyBounds = Pick<DOMRect, "left" | "top">;

export const settledReplyTransform = "translate3d(0px, 0px, 0px)";

// Use viewport coordinates because dialog locking can change the scroll container.
// Divide by phone zoom to recover local CSS pixels.
export function replyPreviewTransform(
  origin: ReplyBounds,
  target: ReplyBounds,
  zoom = 1,
) {
  const x = (origin.left - target.left) / zoom;
  const y = (origin.top - target.top) / zoom;
  // Translate without resizing; fixed decimals avoid exponent notation in CSS transforms.
  return `translate3d(${x.toFixed(5)}px, ${y.toFixed(5)}px, 0px)`;
}

export function animateReplyTransform(
  value: MotionValue<string>,
  target: string,
  duration: number,
) {
  return animate(value, target, { duration, ease: [0.32, 0.72, 0, 1] });
}
