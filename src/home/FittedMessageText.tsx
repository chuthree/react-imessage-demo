import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "cn";
import fitMessageText from "./fitMessageText";

export default function FittedMessageText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const text = ref.current;
    if (!text) return;
    let disposed = false;
    const measure = () => {
      if (!disposed) fitMessageText(text);
    };
    measure();
    // Observe available list width, not the bubble that this measurement shrinks.
    const container = text.closest("ol");
    let previousWidth = -1;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width === previousWidth) return;
      previousWidth = width;
      measure();
    });
    if (container) observer.observe(container);
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [children]);

  return (
    <span
      ref={ref}
      data-fit-message-text
      suppressHydrationWarning
      className={cn("block max-w-full min-w-0", className)}
    >
      {children}
    </span>
  );
}
