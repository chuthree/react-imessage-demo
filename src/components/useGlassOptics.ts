"use client";

import { useSyncExternalStore } from "react";

const refractiveOptics = {
  strength: 0.1,
  depth: 0.2,
  curvature: 0.1,
  bendWidth: 0.12,
  dispersion: 0.4,
  frost: 1.2,
  brightness: 0.3,
  specular: 0,
};
const frostedOptics = { frost: 16, saturate: 1.3, specular: 0 };
const subscribe = () => () => {};
const getServerSnapshot = () => false;

function getBrowserSnapshot() {
  const ua = navigator.userAgent;
  return (
    ("userAgentData" in navigator || /\b(?:Chrome|Chromium|Edg)\//.test(ua)) &&
    !/\b(?:CriOS|EdgiOS|FxiOS|OPiOS)\b|iPhone|iPad|iPod/.test(ua)
  );
}

export function useGlassOptics() {
  const canRefract = useSyncExternalStore(
    subscribe,
    getBrowserSnapshot,
    getServerSnapshot,
  );

  return [canRefract ? refractiveOptics : frostedOptics, canRefract] as const;
}
