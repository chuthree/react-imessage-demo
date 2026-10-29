import { useLayoutEffect, useRef, type RefObject } from "react";
import { animate, motionValue } from "framer-motion";
import { chatScroller } from "./chatSendAnimation";

const spring = { type: "spring", duration: 0.4, bounce: 0 } as const;

// Both stages provide intrinsic content inside a separate animated height host.
export default function useChatScroll(
  listRef: RefObject<HTMLElement | null>,
  following: RefObject<boolean>,
  flight: RefObject<(() => void) | null>,
  enabled: () => boolean,
  reduced: boolean,
) {
  const options = useRef({ enabled, reduced });
  const controller = useRef<{
    list: HTMLElement;
    source: EventTarget;
    measure: () => void;
    dispose: () => void;
  } | null>(null);

  useLayoutEffect(() => {
    options.current = { enabled, reduced };
    const list = listRef.current;
    const scroller = list ? chatScroller(list) : null;
    // Hydration switches mobile document scrolling to the desktop phone's
    // inner scroller without replacing the list DOM node.
    if (
      controller.current?.list !== list ||
      controller.current?.source !== scroller?.source
    ) {
      controller.current?.dispose();
      controller.current = null;
    }
    if (!list || !scroller) return;
    if (!controller.current) {
      const host = list.parentElement!;
      const height = motionValue(list.offsetHeight);
      let previousHeight = list.offsetHeight;
      let previousWidth = list.offsetWidth;
      let previouslyActive = false;
      let disposed = false;
      let heightAnimation: ReturnType<typeof animate> | undefined;
      const rows = new Map<
        HTMLElement,
        { top: number; animation?: Animation }
      >();
      // scrollTo clamps to the available range; detection must agree
      // with that reachable destination, including during height changes.
      const bottom = () => Math.min(scroller.bottom(), scroller.end());
      let lastScrollTop = scroller.top();
      const followBottom = () => {
        scroller.scroll(bottom());
        // scroll events are asynchronous. Remember our own write so a
        // later height update cannot reinterpret it as a user gesture.
        lastScrollTop = scroller.top();
      };
      const syncFollowing = () => {
        const top = scroller.top();
        const delta = top - lastScrollTop;
        lastScrollTop = top;
        if (
          Math.abs(delta) <= 0.5 ||
          !options.current.enabled() ||
          flight.current ||
          scroller.animating()
        )
          return;
        // Observe the user's position; never snap a manual scroll.
        // One pixel only accounts for rounded browser scroll metrics.
        following.current = delta > 0 && scroller.end() - top <= 1;
      };
      scroller.source.addEventListener("scroll", syncFollowing, {
        passive: true,
      });
      // Layout pixels exclude phone zoom, shared transforms and scroll jelly.
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
      const releaseHeight = () => {
        host.style.removeProperty("height");
        releaseClip();
      };
      const releaseClip = () => {
        host.style.removeProperty("overflow");
        host.style.removeProperty("overflow-clip-margin");
      };
      const stopLayout = () => {
        heightAnimation?.stop();
        heightAnimation = undefined;
        for (const row of rows.values()) {
          row.animation?.cancel();
          row.animation = undefined;
        }
      };
      const unsubscribe = height.on("change", (value) => {
        host.style.height = `${Math.max(0, value)}px`;
        // Height and bottom following share a clock, rather than a
        // second smooth-scroll controller chasing a moving destination.
        if (
          following.current &&
          options.current.enabled() &&
          !flight.current &&
          !scroller.animating()
        )
          followBottom();
      });
      const observer = new ResizeObserver(() => measure());
      const measure = () => {
        if (disposed) return;
        const nextHeight = list.offsetHeight;
        const nextWidth = list.offsetWidth;
        const active = options.current.enabled() && !options.current.reduced;
        const canAnimate =
          previouslyActive && active && nextWidth === previousWidth;
        const baseTop = layoutTop(list);
        const elements = new Set(
          list.querySelectorAll<HTMLElement>("[data-chat-layout-row]"),
        );
        for (const [element, row] of rows) {
          if (!elements.has(element)) {
            row.animation?.cancel();
            observer.unobserve(element);
            rows.delete(element);
          }
        }
        for (const element of elements) {
          const top = layoutTop(element) - baseTop;
          const row = rows.get(element);
          const translation = row?.animation
            ? parseFloat(
                getComputedStyle(element).translate.split(" ")[1] ?? "0",
              ) || 0
            : 0;
          const delta = row ? row.top + translation - top : 0;
          if (row && (row.top !== top || !canAnimate)) row.animation?.cancel();
          let animation = row?.animation;
          if (canAnimate && row && row.top !== top && Math.abs(delta) > 0.5) {
            animation = element.animate(
              [{ translate: `0 ${delta}px` }, { translate: "0 0" }],
              {
                duration: 400,
                easing: "cubic-bezier(0.32, 0.72, 0, 1)",
              },
            );
          } else if (!canAnimate) animation = undefined;
          rows.set(element, { top, animation });
          observer.observe(element);
        }
        if (!canAnimate) {
          stopLayout();
          height.jump(nextHeight);
        } else if (Math.abs(nextHeight - previousHeight) > 0.5) {
          heightAnimation = animate(height, nextHeight, {
            ...spring,
            onComplete: () => {
              heightAnimation = undefined;
              releaseClip();
            },
          });
        }
        // Keep the measured range between updates too: otherwise a
        // shrinking DOM can clamp scrollTop before the observer runs.
        host.style.height = `${height.get()}px`;
        if (heightAnimation) {
          host.style.overflow = "clip";
          host.style.overflowClipMargin = "40px";
        } else releaseClip();
        previousHeight = nextHeight;
        previousWidth = nextWidth;
        previouslyActive = active;
      };
      observer.observe(list);
      controller.current = {
        list,
        source: scroller.source,
        measure,
        dispose: () => {
          disposed = true;
          scroller.source.removeEventListener("scroll", syncFollowing);
          observer.disconnect();
          stopLayout();
          unsubscribe();
          height.destroy();
          releaseHeight();
        },
      };
    }
    // Sending/preview effects establish ownership before this measurement.
    // The observer also catches image, font and nested component changes.
    const current = controller.current;
    queueMicrotask(() => current?.measure());
  });

  useLayoutEffect(
    () => () => {
      controller.current?.dispose();
      controller.current = null;
    },
    [],
  );
}
