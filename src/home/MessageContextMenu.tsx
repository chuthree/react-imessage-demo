import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal, flushSync } from "react-dom";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import {
  FloatingFocusManager,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import copy from "clipboard-copy";
import { useTranslations } from "use-intl";
import ProfileGlassSurface from "../components/ProfileGlassSurface";
import { glassPressMotion } from "../components/capsuleMotion";
import {
  useContainedViewport,
  useContainedViewportLocked,
} from "../components/ContainedViewport";
import {
  liftMessagePhoto,
  messageSurface,
  messageSurfaceBounds,
} from "./messageSurface";
import { messageCopyText } from "./messageCopy";
import { useTheme } from "./HomeThemeProvider";

const panelWidth = 192;
const panelHeight = 113;
const gap = 12;
const inset = 16;

// The message and its menu share a single interruptible progress, including
// the upward displacement needed to keep both inside the phone viewport.
export default function MessageContextMenu({
  message,
  copyLink,
  onClose,
  onReply,
}: {
  message: HTMLElement | null;
  copyLink: HTMLAnchorElement | null;
  onClose: () => void;
  onReply: () => void;
}) {
  const t = useTranslations("Conversation");
  const { resolvedTheme } = useTheme();
  const glassMotion = glassPressMotion(resolvedTheme === "dark");
  const viewport = useContainedViewport();
  const [pageHost, setPageHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Keep the mobile glass mounted between menus, just like desktop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageHost(document.body);
  }, []);
  const portalHost = viewport ?? pageHost;
  const locked = useContainedViewportLocked();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [frame, setFrame] = useState(0);
  const progress = useMotionValue(0);
  const closing = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const composerOverlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const afterClose = useRef<(() => void) | null>(null);
  const copyText = useRef("");
  const backdropHost =
    message?.closest<HTMLElement>("[data-reply-preview-stage]") ?? portalHost;
  const [geometry, setGeometry] = useState({
    dx: 0,
    menuLeft: 0,
    menuTop: 0,
    menuDy: 0,
    outgoing: false,
  });
  const { refs, context } = useFloating({ open, onOpenChange: setOpen });
  const dismiss = useDismiss(context, {
    enabled: !locked,
    outsidePressEvent: "pointerdown",
    capture: { outsidePress: true },
    outsidePress: (event) => {
      if (
        message &&
        messageSurface(message).hasAttribute("data-message-actions") &&
        messageSurface(message).contains(event.target as Node)
      )
        return false;
      event.preventDefault();
      event.stopPropagation();
      return true;
    },
  });
  const role = useRole(context);
  const { getFloatingProps } = useInteractions([dismiss, role]);

  useLayoutEffect(() => {
    // Desktop menus dim only the simulated phone, not the browser canvas.
    if (!message || viewport || window.matchMedia("(min-width: 640px)").matches)
      return;
    const root = document.documentElement;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[data-home-theme-color="light"]',
    );
    const previousColor = meta?.content;
    const previousDim = root.style.getPropertyValue("--home-browser-dim");
    // Use the same committed frame as the black/20 scrim. Dark mode stays
    // black; retain both media-qualified metas so system changes work too.
    const dim = Math.min(1, Math.max(0, frame)) * 0.2;
    const channel = Math.round(255 * (1 - dim));
    root.style.setProperty("--home-browser-dim", String(dim));
    if (meta) meta.content = `rgb(${channel}, ${channel}, ${channel})`;
    return () => {
      if (previousDim)
        root.style.setProperty("--home-browser-dim", previousDim);
      else root.style.removeProperty("--home-browser-dim");
      if (meta && previousColor !== undefined) meta.content = previousColor;
    };
  }, [message, viewport, frame]);

  const finishClose = useEffectEvent(() => {
    if (!message) return;
    const action = message.isConnected ? afterClose.current : null;
    afterClose.current = null;
    flushSync(onClose);
    action?.();
  });

  const surfaceZIndex = useEffectEvent((original: string) =>
    open ? "21" : original,
  );

  useLayoutEffect(() => {
    if (!message || !portalHost) return;
    const bounds =
      viewport?.getBoundingClientRect() ??
      new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    // offsetWidth rounds 393.75px to 394px even at zoom=1. Use the
    // fractional layout width so the portal and source share exact pixels.
    const zoom = viewport
      ? bounds.width / parseFloat(getComputedStyle(viewport).width)
      : 1;
    const source = messageSurface(message);
    const rect = source.getBoundingClientRect();
    const visible = messageSurfaceBounds(source);
    const left = (rect.left - bounds.left) / zoom;
    const top = (rect.top - bounds.top) / zoom;
    const visibleLeft = (visible.left - bounds.left) / zoom;
    const visibleTop = (visible.top - bounds.top) / zoom;
    const visibleWidth = visible.width / zoom;
    const visibleHeight = visible.height / zoom;
    const visual = viewport ? null : window.visualViewport;
    const availableWidth = visual?.width ?? bounds.width / zoom;
    const availableHeight = visual?.height ?? bounds.height / zoom;
    const safeArea = overlayRef.current
      ? getComputedStyle(overlayRef.current)
      : null;
    const minLeft = (visual?.offsetLeft ?? 0) + inset;
    const minTop =
      (visual?.offsetTop ?? 0) +
      inset +
      parseFloat(safeArea?.paddingTop ?? "0");
    const maxRight = (visual?.offsetLeft ?? 0) + availableWidth - inset;
    const maxBottom =
      (visual?.offsetTop ?? 0) +
      availableHeight -
      inset -
      (viewport ? 0 : parseFloat(safeArea?.paddingBottom ?? "0"));
    // Very tall messages shrink only enough to leave both actions reachable.
    const scale = Math.min(
      1.06,
      Math.max(1, maxBottom - minTop - panelHeight - gap) / visibleHeight,
      (maxRight - minLeft) / visibleWidth,
    );
    const raisedLeft = Math.max(
      minLeft,
      Math.min(visibleLeft, maxRight - visibleWidth * scale),
    );
    const raisedTop = Math.max(
      minTop,
      Math.min(
        visibleTop,
        maxBottom - panelHeight - gap - visibleHeight * scale,
      ),
    );
    const targetLeft = raisedLeft - (visibleLeft - left) * scale;
    let targetTop = raisedTop - (visibleTop - top) * scale;
    const outgoing = !!(
      source.closest("[data-outgoing-message]:not([data-message-reaction])") ??
      source.querySelector(
        "[data-outgoing-message]:not([data-message-reaction])",
      )
    );
    const menuLeft = Math.max(
      minLeft,
      Math.min(
        outgoing ? raisedLeft + visibleWidth * scale - panelWidth : raisedLeft,
        maxRight - panelWidth,
      ),
    );
    const menuTop = visibleTop + visibleHeight + gap;
    const restingMenuLeft = Math.max(
      minLeft,
      Math.min(
        outgoing ? visibleLeft + visibleWidth - panelWidth : visibleLeft,
        maxRight - panelWidth,
      ),
    );
    const menuDy = raisedTop + visibleHeight * scale + gap - menuTop;
    // Measured FLIP geometry must be committed before the first paint.
    setGeometry({
      dx: menuLeft - restingMenuLeft,
      menuLeft,
      menuTop,
      menuDy,
      outgoing,
    });

    const refreshCopyText = () => {
      copyText.current = messageCopyText(source, copyLink);
    };
    refreshCopyText();
    let dirty = false;
    const observer = new MutationObserver(() => {
      dirty = true;
    });
    observer.observe(source, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["href", "src"],
    });
    // Animate the live surface in its original layout/paint context. A cloned
    // surface in a portal can rasterize a pixel differently at identical rects.
    const original = {
      translate: source.style.translate,
      scale: source.style.scale,
      filter: source.style.filter,
      zIndex: source.style.zIndex,
      position: source.style.position,
      inert: source.inert,
    };
    // Messages remain below the composer, including during menu animation.
    // Two non-overlapping scrims cover the message and composer regions.
    const replyStage = message.closest<HTMLElement>(
      "[data-reply-preview-stage]",
    );
    const photoSurface = liftMessagePhoto(source, replyStage ?? portalHost);
    // Lower the header below the scrim's stacking context until the menu
    // finishes closing; the selected live message stays above that scrim.
    const header = (viewport ?? document).querySelector<HTMLElement>(
      "[data-profile-header]",
    );
    const headerZIndex = header?.style.zIndex ?? "";
    const headerBlur = (viewport ?? document).querySelector<HTMLElement>(
      "[data-profile-blur]",
    );
    const headerBlurZIndex = headerBlur?.style.zIndex ?? "";
    if (header) header.style.zIndex = replyStage ? "9" : "19";
    if (headerBlur) headerBlur.style.zIndex = replyStage ? "9" : "19";
    source.style.zIndex = "21";
    const position =
      getComputedStyle(source).position === "static"
        ? "relative"
        : original.position;
    source.style.position = position;
    const desktop = window.matchMedia("(min-width: 640px)").matches;
    source.inert = !desktop;
    if (desktop) source.setAttribute("data-message-actions", "");
    refs.setReference(message);
    // Prepare the source and geometry before revealing the resident glass.
    setOpen(true);
    setError(false);
    afterClose.current = null;
    closing.current = false;
    let positionFrame = 0;
    let returned = false;
    let contentBottom = visibleHeight + visibleTop - top;
    // A child cannot escape the lifted surface's transform/filter stacking
    // context. Render only decorative reaction snapshots below the scrim;
    // the message itself remains its original live DOM.
    const reactionLayer = document.createElement("div");
    reactionLayer.className = "pointer-events-none fixed inset-0 z-[19]";
    reactionLayer.setAttribute("aria-hidden", "true");
    const reactionHost = replyStage ?? portalHost;
    reactionHost.appendChild(reactionLayer);
    const reactions = new Map<
      HTMLElement,
      { visibility: string; snapshot: HTMLElement }
    >();
    const updatePosition = () => {
      // Keep the exact resting pose on screen for a frame before returning
      // ownership. The animation callback can precede this layout loop.
      if (returned) {
        finishClose();
        return;
      }
      if (
        !source.isConnected ||
        !message.isConnected ||
        (photoSurface && !photoSurface.connected())
      ) {
        afterClose.current = null;
        finishClose();
        return;
      }
      // The raised endpoint stays fixed while replies continue underneath.
      // Only the return endpoint follows the live layout (including scroll
      // and ancestor transforms, which ResizeObserver does not report).
      const liveBounds = viewport?.getBoundingClientRect() ?? bounds;
      const liveZoom = viewport
        ? liveBounds.width / parseFloat(getComputedStyle(viewport).width)
        : 1;
      const composer = (viewport ?? document).querySelector<HTMLElement>(
        "[data-home-composer] form, [data-chat-composer-slot] form",
      );
      const overlayBounds = overlayRef.current?.getBoundingClientRect();
      if (overlayBounds) {
        const composerTop =
          composer && composer.dataset.mobileHidden === undefined
            ? composer.getBoundingClientRect().top
            : overlayBounds.bottom;
        // Leave room for the composer's shadow. Both scrims meet at the
        // same edge, so transparent areas are never darkened twice.
        const split =
          Math.max(
            0,
            Math.min(
              overlayBounds.height,
              composerTop -
                overlayBounds.top -
                (composerTop < overlayBounds.bottom ? 24 * liveZoom : 0),
            ),
          ) / liveZoom;
        overlayRef.current?.style.setProperty(
          "--message-menu-scrim-height",
          `${split}px`,
        );
        if (composerOverlayRef.current) {
          const hostTop = viewport?.getBoundingClientRect().top ?? 0;
          composerOverlayRef.current.style.top = `${(overlayBounds.top - hostTop) / liveZoom + split}px`;
        }
      }
      source.style.translate = original.translate;
      source.style.scale = original.scale;
      photoSurface?.update();
      const reactionBounds = reactionLayer.getBoundingClientRect();
      for (const [element, reaction] of reactions) {
        if (source.contains(element)) continue;
        element.style.visibility = reaction.visibility;
        reaction.snapshot.remove();
        reactions.delete(element);
      }
      for (const element of source.querySelectorAll<HTMLElement>(
        "[data-message-reaction]",
      )) {
        let reaction = reactions.get(element);
        if (!reaction || dirty) {
          const visibility = reaction?.visibility ?? element.style.visibility;
          const snapshot = element.cloneNode(true) as HTMLElement;
          snapshot.style.visibility = visibility;
          snapshot.removeAttribute("data-animate");
          snapshot.removeAttribute("data-message-reaction");
          snapshot.removeAttribute("id");
          if (reaction) reaction.snapshot.replaceWith(snapshot);
          else reactionLayer.appendChild(snapshot);
          reaction = { visibility, snapshot };
          reactions.set(element, reaction);
          element.style.visibility = "hidden";
        }
        const resting = element.getBoundingClientRect();
        Object.assign(reaction.snapshot.style, {
          left: `${(resting.left - reactionBounds.left) / liveZoom}px`,
          top: `${(resting.top - reactionBounds.top) / liveZoom}px`,
          right: "auto",
          bottom: "auto",
          width: `${resting.width / liveZoom}px`,
          height: `${resting.height / liveZoom}px`,
        });
      }
      const live = source.getBoundingClientRect();
      if (dirty) {
        dirty = false;
        refreshCopyText();
      }
      const content = messageSurfaceBounds(source);
      const bottom = (content.bottom - live.top) / liveZoom;
      if (Math.abs(bottom - contentBottom) > 0.01) {
        contentBottom = bottom;
        // Receipts can appear or disappear while AI replies arrive.
        // Keep the same gap after the last visible element, including
        // elements positioned outside the surface's layout box.
        targetTop = Math.min(
          targetTop,
          maxBottom - panelHeight - gap - bottom * scale,
        );
        setGeometry((current) => ({
          ...current,
          menuTop: top + bottom + gap,
          menuDy: targetTop - top + bottom * (scale - 1),
        }));
      }
      const p = reduceMotion ? 1 : progress.get();
      const liveLeft = (live.left - liveBounds.left) / liveZoom;
      const liveTop = (live.top - liveBounds.top) / liveZoom;
      const x = (targetLeft - liveLeft) * p;
      const y = (targetTop - liveTop) * p;
      source.style.translate = p === 0 ? original.translate : `${x}px ${y}px`;
      source.style.scale = p === 0 ? original.scale : `${1 + (scale - 1) * p}`;
      source.style.filter =
        p === 0
          ? original.filter
          : `${original.filter === "none" ? "" : original.filter} drop-shadow(0 ${8 * p}px ${16 * p}px rgb(0 0 0 / ${0.16 * p}))`.trim();
      photoSurface?.setZIndex(surfaceZIndex(original.zIndex));
      // Return below the scrim as soon as dismissal starts, while the
      // same live surface continues animating back to its resting pose.
      source.style.zIndex = surfaceZIndex(original.zIndex);
      source.style.position = position;
      if (closing.current) {
        returned = true;
      }
      positionFrame = requestAnimationFrame(updatePosition);
    };
    updatePosition();
    return () => {
      cancelAnimationFrame(positionFrame);
      observer.disconnect();
      source.style.translate = original.translate;
      source.style.scale = original.scale;
      source.style.filter = original.filter;
      source.style.zIndex = original.zIndex;
      source.style.position = original.position;
      source.inert = original.inert;
      if (desktop) source.removeAttribute("data-message-actions");
      if (header) header.style.zIndex = headerZIndex;
      if (headerBlur) headerBlur.style.zIndex = headerBlurZIndex;
      reactions.forEach(({ visibility }, element) => {
        element.style.visibility = visibility;
      });
      photoSurface?.restore();
      reactionLayer.remove();
    };
  }, [message, copyLink, viewport, portalHost, refs, progress, reduceMotion]);

  useEffect(() => {
    const target = open ? 1 : 0;
    if (progress.get() === target) {
      if (!open) finishClose();
      return;
    }
    let animation: { stop: () => void } | undefined;
    const startFrame = requestAnimationFrame(() => {
      animation = animate(progress, target, {
        ...(reduceMotion
          ? { duration: 0.15, ease: "linear" as const }
          : {
              type: "spring" as const,
              duration: open ? 0.4 : 0.3,
              bounce: 0,
            }),
        onUpdate: setFrame,
        onComplete: () => {
          if (!open) closing.current = true;
        },
      });
    });
    return () => {
      cancelAnimationFrame(startFrame);
      animation?.stop();
    };
  }, [open, progress, reduceMotion]);

  useEffect(() => {
    if (!message) return;
    const close = () => setOpen(false);
    const preventScroll = (event: WheelEvent | TouchEvent) =>
      event.preventDefault();
    document.addEventListener("wheel", preventScroll, {
      passive: false,
      capture: true,
    });
    document.addEventListener("touchmove", preventScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    window.visualViewport?.addEventListener("resize", close);
    window.visualViewport?.addEventListener("scroll", close);
    return () => {
      document.removeEventListener("wheel", preventScroll, true);
      document.removeEventListener("touchmove", preventScroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
      window.visualViewport?.removeEventListener("resize", close);
      window.visualViewport?.removeEventListener("scroll", close);
    };
  }, [message]);

  useEffect(() => {
    // A locked device must not restore an old menu when unlocked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (locked) setOpen(false);
  }, [locked]);

  const movement = reduceMotion ? 1 : frame;
  // Keep the lens geometry and displacement map stable. Scale the whole menu
  // from the message-side corner; fade the backdrop owner and rim separately
  // so no fading ancestor changes the glass's backdrop root at opacity=1.
  if (!portalHost || !backdropHost) return null;
  return (
    <>
      {createPortal(
        <div
          ref={overlayRef}
          inert={!message}
          aria-hidden={!message || undefined}
          className="fixed inset-0 z-20 touch-none overflow-hidden pt-[var(--app-safe-top,env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom,0px)]"
          style={{
            visibility: message ? "visible" : "hidden",
            pointerEvents: message ? "auto" : "none",
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            className="absolute inset-x-0 top-0 h-[var(--message-menu-scrim-height,100%)] bg-black/20"
            style={{ opacity: frame }}
          />
        </div>,
        backdropHost,
      )}
      {createPortal(
        <div
          ref={composerOverlayRef}
          inert={!message}
          aria-hidden="true"
          className="fixed inset-x-0 top-full bottom-0 z-[31] touch-none bg-black/20"
          style={{
            visibility: message ? "visible" : "hidden",
            pointerEvents: message ? "auto" : "none",
            opacity: frame,
          }}
          onContextMenu={(event) => event.preventDefault()}
        />,
        portalHost,
      )}
      {createPortal(
        <div
          inert={!message}
          aria-hidden={!message || undefined}
          className="pointer-events-none fixed inset-0 z-40"
          style={{ visibility: message ? "visible" : "hidden" }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <FloatingFocusManager
            context={context}
            disabled={!open || locked}
            initialFocus={panelRef}
            modal
            outsideElementsInert
            getInsideElements={() =>
              message &&
              messageSurface(message).hasAttribute("data-message-actions")
                ? [messageSurface(message)]
                : []
            }
            visuallyHiddenDismiss={t("closeActions")}
          >
            <motion.div
              ref={(node) => {
                panelRef.current = node;
                refs.setFloating(node);
              }}
              initial={false}
              animate={glassMotion.animate}
              whileTap={glassMotion.whileTap}
              transition={glassMotion.transition}
              {...getFloatingProps({
                "aria-label": t("messageActions"),
                tabIndex: -1,
              })}
              className="pointer-events-auto absolute touch-manipulation outline-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none] [&_*]:select-none [&_*]:[-webkit-touch-callout:none] [&_*]:[-webkit-user-select:none]"
              onDragStart={(event) => event.preventDefault()}
              inert={!open}
              style={
                {
                  left: geometry.menuLeft - geometry.dx,
                  top: geometry.menuTop,
                  transformOrigin: geometry.outgoing ? "top right" : "top left",
                  transform: `translate(${geometry.dx * movement}px, ${geometry.menuDy * movement - gap * (1 - movement)}px) scale(${reduceMotion ? 1 : 0.55 + 0.45 * frame})`,
                  "--message-menu-opacity": frame,
                  "--composer-reveal-blur": `${reduceMotion ? 0 : 3 * (1 - frame)}px`,
                } as CSSProperties
              }
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[28px]"
                style={{
                  opacity: frame,
                  boxShadow: "var(--home-glass-shadow, none)",
                }}
              />
              <ProfileGlassSurface
                size={{
                  width: panelWidth,
                  height: panelHeight,
                }}
                radius={28}
                material="frosted"
                materialProgress={0.7}
                className="block! [--home-glass-shadow:none] [&_[data-profile-glass-material]]:opacity-(--message-menu-opacity) [&_[data-profile-glass-outline]]:opacity-(--message-menu-opacity)"
              >
                {null}
              </ProfileGlassSurface>
              <div
                style={{
                  width: panelWidth,
                  height: panelHeight,
                  opacity: frame,
                  filter: "blur(var(--composer-reveal-blur, 0px))",
                }}
                className="absolute top-0 left-0 z-10 flex flex-col p-2 text-[var(--home-glass-foreground,#1c1c1e)]"
              >
                <button
                  type="button"
                  onClick={() => {
                    afterClose.current = onReply;
                    setOpen(false);
                  }}
                  className="grid h-10 w-full shrink-0 grid-cols-[24px_minmax(0,1fr)] items-center justify-start gap-2.5 rounded-full px-3.5 text-left text-[17px] leading-6 outline-none hover:bg-[var(--home-glass-foreground,#1c1c1e)]/5 focus-visible:bg-[var(--home-glass-foreground,#1c1c1e)]/5 active:bg-[var(--home-glass-foreground,#1c1c1e)]/10"
                >
                  <span
                    aria-hidden="true"
                    className="size-6 justify-self-center bg-current mask-[url('/home/message-reply.png')] mask-contain mask-center mask-no-repeat"
                  />
                  {t("reply")}
                </button>
                <div
                  role="separator"
                  className="pointer-events-none mx-3 my-2 h-px shrink-0 bg-[var(--home-glass-foreground,#1c1c1e)]/15"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!copyText.current) {
                      setError(true);
                      return;
                    }
                    try {
                      await copy(copyText.current);
                      setOpen(false);
                    } catch {
                      setError(true);
                    }
                  }}
                  className="grid h-10 w-full shrink-0 grid-cols-[24px_minmax(0,1fr)] items-center justify-start gap-2.5 rounded-full px-3.5 text-left text-[17px] leading-6 outline-none hover:bg-[var(--home-glass-foreground,#1c1c1e)]/5 focus-visible:bg-[var(--home-glass-foreground,#1c1c1e)]/5 active:bg-[var(--home-glass-foreground,#1c1c1e)]/10"
                >
                  <span
                    aria-hidden="true"
                    className="size-6 justify-self-center bg-current mask-[url('/home/message-copy.png')] mask-contain mask-center mask-no-repeat"
                  />
                  <span
                    aria-live="polite"
                    className={error ? "text-xs leading-4" : undefined}
                  >
                    {t(error ? "copyFailed" : "copy")}
                  </span>
                </button>
              </div>
            </motion.div>
          </FloatingFocusManager>
        </div>,
        portalHost,
      )}
      {message &&
        !viewport &&
        createPortal(
          // Only cover Safari's sampling edge while the menu is present, including
          // its exit animation. Normal scrolling keeps the native browser effect.
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[max(12px,env(safe-area-inset-top,0px))] bg-(--home-browser-background) sm:hidden"
          />,
          portalHost,
        )}
    </>
  );
}
