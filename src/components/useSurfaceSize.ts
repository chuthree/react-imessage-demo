"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export default function useSurfaceSize(
  ref: RefObject<Element | null>,
  observeParent = true,
  enabled = true,
) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!enabled) return;
    const element = observeParent ? ref.current?.parentElement : ref.current;
    if (!(element instanceof HTMLElement)) return;
    const update = () => {
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.borderBoxSize[0];
      if (!box) {
        update();
        return;
      }
      setSize((previous) =>
        previous.width === box.inlineSize && previous.height === box.blockSize
          ? previous
          : { width: box.inlineSize, height: box.blockSize },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, observeParent, enabled]);
  return size;
}
