import { createContext, useContext } from "react";

// Portals share the device's containing block instead of escaping to body.
export const ContainedViewportContext = createContext<HTMLElement | null>(null);
export const useContainedViewport = () => useContext(ContainedViewportContext);

export const HomeComposerContainerContext = createContext<HTMLElement | null>(
  null,
);
export const useHomeComposerContainer = () =>
  useContext(HomeComposerContainerContext);

// Suspend app focus traps while the simulated device is locked.
export const ContainedViewportLockedContext = createContext(false);
export const useContainedViewportLocked = () =>
  useContext(ContainedViewportLockedContext);
