import { useTranslations } from "use-intl";

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  useContainedViewportLocked,
  useHomeComposerContainer,
} from "../components/ContainedViewport";
import { Dialog } from "@base-ui/react/dialog";
import {
  AnimatePresence,
  animate,
  motion,
  motionValue,
  useIsPresent,
  usePresence,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import MessageComposer, {
  type MessageComposerHandle,
} from "../components/MessageComposer";
import type { ChatPhoto } from "../lib/chat/photos";
import type { ChatOrigin, MessageReplyTarget } from "./chat";
import {
  animateChatSend,
  animateChatScroll,
  chatComposerFocusEvent,
  chatScroller,
} from "./chatSendAnimation";
import useChatScroll from "./useChatScroll";
import CloseButtonContent, {
  closeButtonClassName,
} from "../components/CloseButtonContent";
import {
  animateReplyTransform,
  replyPreviewTransform,
  settledReplyTransform,
  type ReplyBounds,
} from "./replyPreviewAnimation";

const previewDuration = { open: 0.45, close: 0.4 } as const;
const fadeEasing = "cubic-bezier(0.23, 1, 0.32, 1)";

function isPreviewBackground(target: EventTarget, viewport: EventTarget) {
  return (
    target === viewport ||
    (target instanceof Element && target.matches("[data-reply-surface]"))
  );
}

function surfaceBounds(element: HTMLElement) {
  // Outgoing shared surfaces include a full-width row and delivery receipts.
  // Anchor both views to the visible bubble, not that row's left edge.
  return (
    element.querySelector<HTMLElement>(
      '[data-chat-outgoing], [data-message-selection="outgoing"], [data-chat-photo-group], [data-outgoing-message]',
    ) ?? element
  ).getBoundingClientRect();
}

type ReplySurfaceRegistry = {
  sources: Map<string, HTMLElement>;
  previews: Map<string, HTMLElement>;
  origins: Map<string, ReplyBounds>;
  initialized: Set<string>;
  stops: Map<string, () => void>;
  animations: Map<
    string,
    {
      transform: MotionValue<string>;
      opacity: MotionValue<number>;
    }
  >;
  images: Map<
    string,
    {
      source?: SVGImageElement;
      preview?: SVGImageElement;
      restore?: () => void;
    }
  >;
};

const ReplyPreviewContext = createContext<{
  activeSurfaceIds?: readonly string[];
  inPreview: boolean;
  sendAnimating?: boolean;
  onNavigate?: () => void;
  scrollToBottom?: () => void;
  mounted: boolean;
  reduceMotion: boolean;
  surfaces: ReplySurfaceRegistry;
} | null>(null);

export function useReplyPreview() {
  const context = useContext(ReplyPreviewContext);
  if (!context) throw new Error("Reply surfaces must be inside ReplyPreview.");
  return context;
}

// React owns each image's slot. Only the playing image moves between the slots,
// and it returns before either React tree is removed.
export function useSharedReplyImage(
  messageId: string,
  index: number,
  imageRef: RefObject<SVGImageElement | null>,
) {
  const context = useContext(ReplyPreviewContext);
  const surfaces = context?.surfaces;
  const inPreview = context?.inPreview ?? false;
  const mounted = context?.mounted ?? false;
  useLayoutEffect(() => {
    const image = imageRef.current;
    if (
      !image ||
      !surfaces ||
      !messageId ||
      image
        .closest("[data-reply-surface]")
        ?.getAttribute("data-reply-surface") !== messageId
    )
      return;
    const key = `${messageId}:${index}`;
    const entry = surfaces.images.get(key) ?? {};
    surfaces.images.set(key, entry);
    const side = inPreview ? "preview" : "source";
    entry[side] = image;
    const { source, preview } = entry;
    if (source && preview && mounted) {
      const sourceSlot = source.parentElement!;
      const previewSlot = preview.parentElement!;
      const attributes = ["width", "height", "clip-path"];
      const original = attributes.map((name) => source.getAttribute(name));
      const move = (slot: Element) => {
        const target = slot as Element & {
          moveBefore?: (node: Node, child: Node | null) => void;
        };
        if (
          target.moveBefore &&
          source.isConnected &&
          slot.isConnected &&
          source.ownerDocument === slot.ownerDocument
        )
          target.moveBefore(source, null);
        else slot.insertBefore(source, null);
      };
      for (const name of attributes) {
        const value = preview.getAttribute(name);
        if (value !== null) source.setAttribute(name, value);
      }
      preview.style.visibility = "hidden";
      move(previewSlot);
      entry.restore = () => {
        move(sourceSlot);
        attributes.forEach((name, i) => {
          const value = original[i];
          if (value === null) source.removeAttribute(name);
          else source.setAttribute(name, value);
        });
        preview.style.removeProperty("visibility");
      };
    }
    return () => {
      entry.restore?.();
      entry.restore = undefined;
      if (entry[side] === image) delete entry[side];
      if (!entry.source && !entry.preview) surfaces.images.delete(key);
    };
  }, [messageId, index, imageRef, surfaces, inPreview, mounted]);
}

// Explicit viewport FLIP keeps a single continuous path across the portal.
export function SharedReplySurface({
  id,
  className,
  children,
  interactive = true,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  interactive?: boolean;
}) {
  if (!id) return <>{children}</>;
  return (
    <AnimatedReplySurface
      key={id}
      id={id}
      className={className}
      interactive={interactive}
    >
      {children}
    </AnimatedReplySurface>
  );
}

function AnimatedReplySurface({
  id,
  className,
  children,
  interactive,
}: {
  id: string;
  className?: string;
  children: ReactNode;
  interactive: boolean;
}) {
  const { inPreview, mounted, reduceMotion, surfaces, activeSurfaceIds } =
    useReplyPreview();
  const elementRef = useRef<HTMLDivElement>(null);
  // Base UI may remount popup content when a closing dialog reopens. Preserve
  // presentation values above the portal so retargeting never restarts at origin.
  const [values] = useState(() => {
    let existing = surfaces.animations.get(id);
    if (!existing) {
      existing = {
        transform: motionValue(settledReplyTransform),
        opacity: motionValue(1),
      };
      surfaces.animations.set(id, existing);
    }
    return existing;
  });
  const { transform, opacity } = values;
  const [present, safeToRemove] = usePresence(inPreview);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const elements = inPreview ? surfaces.previews : surfaces.sources;
    elements.set(id, element);
    return () => {
      if (elements.get(id) === element) elements.delete(id);
    };
  }, [id, inPreview, surfaces]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !inPreview) return;
    if (!mounted) {
      if (!present) safeToRemove?.();
      return;
    }

    // New messages belong to sending/scrolling, not the opening transition.
    if (present && !surfaces.origins.has(id)) {
      surfaces.initialized.add(id);
      transform.set(settledReplyTransform);
      element.style.transform = settledReplyTransform;
      opacity.set(1);
      return;
    }

    // Read the resting destination without including an in-flight transform.
    const previousTransform = element.style.transform;
    element.style.transform = "none";
    const target = surfaceBounds(element);
    element.style.transform = previousTransform;
    const origin = surfaces.origins.get(id) ?? target;
    const device = element.closest("[data-home-phone-device]");
    const zoom = device
      ? Number(getComputedStyle(device).getPropertyValue("zoom")) || 1
      : 1;
    const from = replyPreviewTransform(origin, target, zoom);
    let cancelled = false;

    if (reduceMotion) {
      transform.set(settledReplyTransform);
      element.style.transform = settledReplyTransform;
    }

    if (!surfaces.initialized.has(id)) {
      surfaces.initialized.add(id);
      if (reduceMotion) {
        opacity.set(0);
        element.style.opacity = "0";
      } else {
        transform.set(from);
        // MotionValue writes are frame-scheduled. Set this first frame
        // synchronously so the destination never flashes before moving.
        element.style.transform = from;
      }
    }

    const animation = reduceMotion
      ? animate(opacity, present ? 1 : 0, { duration: 0.15 })
      : animateReplyTransform(
          transform,
          present ? settledReplyTransform : from,
          present ? previewDuration.open : previewDuration.close,
        );
    const stop = () => animation.stop();
    surfaces.stops.set(id, stop);

    void animation.finished.then(() => {
      if (!cancelled && !present) safeToRemove?.();
    });
    return () => {
      cancelled = true;
      stop();
      if (surfaces.stops.get(id) === stop) surfaces.stops.delete(id);
    };
  }, [
    id,
    inPreview,
    mounted,
    present,
    reduceMotion,
    surfaces,
    transform,
    opacity,
    safeToRemove,
  ]);

  return (
    <motion.div
      ref={elementRef}
      className={className}
      data-reply-surface={id}
      style={{
        pointerEvents: inPreview ? (interactive ? "auto" : "none") : undefined,
        visibility:
          mounted &&
          !inPreview &&
          (!activeSurfaceIds || activeSurfaceIds.includes(id))
            ? "hidden"
            : undefined,
        transform: inPreview ? transform : undefined,
        transformOrigin: "top left",
        opacity: inPreview ? opacity : undefined,
      }}
      initial={false}
    >
      {children}
    </motion.div>
  );
}

function ReplyPreviewCloseButton({
  buttonRef,
  ready,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  ready: boolean;
}) {
  const present = useIsPresent();

  const t = useTranslations("Conversation");
  return (
    <Dialog.Close
      ref={buttonRef}
      aria-label={t("close")}
      style={{
        visibility: ready && present ? undefined : "hidden",
        pointerEvents: ready && present ? "auto" : "none",
      }}
      className={closeButtonClassName}
    >
      <CloseButtonContent />
    </Dialog.Close>
  );
}

function PreparedReplyContent({
  children,
  onReady,
}: {
  children: ReactNode;
  onReady: (content: HTMLDivElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let cancelled = false;
    let frame = 0;
    const content = ref.current;
    if (!content) return;
    const prepare = () => {
      if (cancelled) return;
      // Let the dialog commit its open state before measuring. Text-only
      // threads must not take a synchronous shortcut through hidden layout.
      frame = requestAnimationFrame(() => {
        if (!cancelled) onReady(content);
      });
    };
    const images = [...content.querySelectorAll("img")];
    // A cached source image doesn't guarantee that its new portal copy has
    // been decoded. Keep the original visible until the copy can be painted.
    const pending = images.filter(
      (image) => typeof image.decode === "function",
    );
    if (!pending.length) {
      prepare();
    } else {
      for (const image of pending) image.loading = "eager";
      void Promise.allSettled(pending.map((image) => image.decode())).then(
        () => {
          // Failed images must not trap the dialog in its preparation state.
          prepare();
        },
      );
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [onReady]);
  return (
    <div ref={ref} className="flex flex-col gap-6">
      {children}
    </div>
  );
}

export default function ReplyPreview({
  title,
  replyTarget,
  preview,
  children,
  activeSurfaceIds,
  previewKey,
  onSend,
  busy,
  messageGestures,
  composerSendRef,
  onBeforeSend,
}: {
  title: string;
  replyTarget?: MessageReplyTarget;
  preview: ReactNode;
  children: ReactNode;
  activeSurfaceIds?: readonly string[];
  previewKey?: string;
  onSend: (
    message: string,
    origin?: DOMRect,
    context?: MessageReplyTarget,
    photos?: ChatPhoto[],
  ) => boolean;
  busy: boolean;
  messageGestures: (children: ReactNode) => ReactNode;
  composerSendRef?: RefObject<MessageComposerHandle | null>;
  onBeforeSend?: () => Promise<void>;
}) {
  const [surfaces] = useState<ReplySurfaceRegistry>(() => ({
    sources: new Map(),
    previews: new Map(),
    origins: new Map(),
    initialized: new Set(),
    stops: new Map(),
    animations: new Map(),
    images: new Map(),
  }));
  const [composerContainer, setComposerContainer] =
    useState<HTMLDivElement | null>(null);
  const footer = useHomeComposerContainer();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const isOpen = useRef(false);
  const openedThread = useRef<string | null>(null);
  const deviceLocked = useContainedViewportLocked();
  const actionsRef = useRef<Dialog.Root.Actions | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const pendingSend = useRef<ChatOrigin | null>(null);
  const flight = useRef<(() => void) | null>(null);
  const focusScroll = useRef<(() => void) | null>(null);
  const [sendAnimating, setSendAnimating] = useState(false);
  const following = useRef(false);
  const outsidePress = useRef<{ id: number; x: number; y: number } | null>(
    null,
  );
  const restoreTriggerFocus = useRef(true);
  const beforeKeyboard = useRef<{
    left: number;
    top: number;
    height: number;
    width: number;
  } | null>(null);
  const keyboardCloseFrame = useRef<number | null>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const onPreviewReady = useCallback((content: HTMLDivElement) => {
    if (isOpen.current) {
      // Position the hidden stage before shared surfaces measure their destinations.
      const scroller = content.closest<HTMLElement>(
        "[data-reply-preview-scroll]",
      );
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
      setReady(true);
    }
  }, []);

  useLayoutEffect(() => {
    if (ready && isOpen.current)
      closeRef.current?.focus({ preventScroll: true });
  }, [ready]);

  useChatScroll(
    layoutRef,
    following,
    flight,
    () => open && ready && !deviceLocked && pendingSend.current === null,
    reduceMotion,
  );

  const scrollToBottom = useCallback(() => {
    const content = contentRef.current;
    if (deviceLocked || !content) return;
    focusScroll.current?.();
    following.current = true;
    if (flight.current) return;
    const scroller = chatScroller(content);
    if (reduceMotion) scroller.scroll(scroller.bottom());
    else
      focusScroll.current = animateChatScroll(
        content,
        () => {
          focusScroll.current = null;
        },
        undefined,
        scroller.bottom,
      );
  }, [deviceLocked, reduceMotion]);

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!open || !ready || deviceLocked || !scroller || !content) return;
    const origin = pendingSend.current;
    pendingSend.current = null;
    const target = [
      ...content.querySelectorAll<HTMLElement>("[data-chat-outgoing]"),
    ].at(-1);
    if (origin && target && !reduceMotion) {
      focusScroll.current?.();
      flight.current?.();
      following.current = true;
      setSendAnimating(true);
      flight.current = animateChatSend(content, target, origin, (completed) => {
        flight.current = null;
        setSendAnimating(false);
        if (!completed) following.current = false;
      });
    } else if (origin && following.current) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [preview, open, ready, deviceLocked, reduceMotion]);

  useLayoutEffect(() => {
    if (!open || deviceLocked || reduceMotion) {
      focusScroll.current?.();
      pendingSend.current = null;
      flight.current?.();
    }
  }, [open, deviceLocked, reduceMotion]);
  useLayoutEffect(
    () => () => {
      flight.current?.();
      focusScroll.current?.();
      if (keyboardCloseFrame.current !== null)
        cancelAnimationFrame(keyboardCloseFrame.current);
    },
    [],
  );

  useLayoutEffect(() => {
    let frame = 0;
    const resize = () => {
      if (
        !matchMedia("(min-width: 640px)").matches &&
        document.activeElement?.matches('textarea[name="message"]')
      )
        return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scroller = scrollRef.current;
        if (
          open &&
          ready &&
          !deviceLocked &&
          following.current &&
          scroller &&
          !chatScroller(scroller).animating()
        )
          scrollToBottom();
      });
    };
    window.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    if (scrollRef.current) observer.observe(scrollRef.current);
    const form = footer?.querySelector("form");
    if (form) observer.observe(form);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [open, ready, deviceLocked, footer, scrollToBottom]);

  const stopFollowing = useCallback(() => {
    focusScroll.current?.();
    outsidePress.current = null;
    flight.current?.();
  }, []);

  const listFadeStyle: CSSProperties = {
    opacity: open && ready ? 0 : 1,
    transitionProperty: "opacity",
    transitionTimingFunction: fadeEasing,
    transitionDuration: `${reduceMotion ? 0.15 : open ? previewDuration.open : previewDuration.close}s`,
  };

  const focusComposer = () => {
    if (deviceLocked) return;
    if (!open) {
      window.dispatchEvent(new Event(chatComposerFocusEvent));
      return;
    }
    scrollToBottom();
  };

  const isInputAtBottom = (distance = 96) => {
    const stage = open ? contentRef.current : composerContainer;
    if (!stage) return false;
    const scroller = chatScroller(stage);
    return scroller.end() - scroller.top() <= distance;
  };

  const composer = (
    <MessageComposer
      sendRef={composerSendRef}
      onBeforeSend={onBeforeSend}
      inReplyPreview={open}
      value={message}
      onChange={setMessage}
      replyTarget={open ? replyTarget : undefined}
      busy={busy}
      onInputFocus={focusComposer}
      onBeforeInputFocus={() => {
        if (isInputAtBottom()) return true;
        focusComposer();
        return false;
      }}
      onSend={(text, origin, photos) => {
        const previewOrigin =
          open && origin && contentRef.current ? { rect: origin } : null;
        // The active stage owns the flight; the hidden timeline must not animate.
        const sent = onSend(
          text,
          open ? undefined : origin,
          open ? replyTarget : undefined,
          photos,
        );
        if (sent && open) {
          pendingSend.current = previewOrigin;
          following.current = true;
        }
        return sent;
      }}
    />
  );

  return (
    <Dialog.Root
      modal={!deviceLocked}
      open={open}
      actionsRef={actionsRef}
      onOpenChange={(nextOpen, details) => {
        if (deviceLocked) {
          details.cancel();
          return;
        }
        if (!nextOpen && beforeKeyboard.current) {
          details.cancel();
          if (keyboardCloseFrame.current !== null) return;
          const origin = beforeKeyboard.current;
          const input = (footer ?? composerContainer)?.querySelector(
            'textarea[name="message"]',
          );
          if (input instanceof HTMLTextAreaElement) input.blur();
          focusScroll.current?.();
          flight.current?.();
          following.current = false;
          let previous = "";
          const finishClosingKeyboard = () => {
            const visual = window.visualViewport;
            const height = visual?.height ?? window.innerHeight;
            const position = `${height}:${visual?.offsetTop}:${window.scrollY}`;
            // Let the browser move the input above the keyboard normally.
            // Restore the background only after that keyboard has closed.
            const keyboardVisible =
              window.innerWidth === origin.width &&
              origin.height - height > 100;
            if (keyboardVisible || position !== previous) {
              previous = position;
              keyboardCloseFrame.current = requestAnimationFrame(
                finishClosingKeyboard,
              );
              return;
            }
            keyboardCloseFrame.current = null;
            beforeKeyboard.current = null;
            window.scrollTo({
              left: origin.left,
              top: origin.top,
              behavior: "instant",
            });
            actionsRef.current?.close();
          };
          keyboardCloseFrame.current = requestAnimationFrame(
            finishClosingKeyboard,
          );
          return;
        }
        if (!nextOpen) {
          pendingSend.current = null;
          flight.current?.();
        }
        if (!nextOpen) details.preventUnmountOnClose();
        const trigger =
          details.event.target instanceof Element
            ? details.event.target.closest("[data-reply-thread]")
            : null;
        const nextThread =
          trigger?.getAttribute("data-reply-thread") ?? previewKey ?? null;
        const changingThread =
          nextOpen && mounted && nextThread !== openedThread.current;
        if (changingThread) setReady(false);
        if (nextOpen && (!mounted || changingThread)) {
          surfaces.initialized.clear();
          for (const stop of surfaces.stops.values()) stop();
          for (const values of surfaces.animations.values()) {
            values.transform.set(settledReplyTransform);
            values.opacity.set(1);
          }
        }
        if (!nextOpen || !mounted || changingThread) {
          // Replies can be added or resized while the preview is open.
          // Closing needs every source's current bounds, including new surfaces.
          surfaces.origins.clear();
          for (const [id, element] of surfaces.sources) {
            surfaces.origins.set(id, surfaceBounds(element));
          }
        }
        if (nextOpen && mounted && !changingThread) {
          // Capture the last painted frame before a portal remount.
          // A MotionValue may already be ahead of that rendered frame.
          for (const [id, element] of surfaces.previews) {
            const values = surfaces.animations.get(id);
            if (!values) continue;
            surfaces.stops.get(id)?.();
            values.transform.stop();
            values.opacity.stop();
            values.transform.set(
              element.style.transform || settledReplyTransform,
            );
            values.opacity.set(Number(element.style.opacity || 1));
          }
        }
        if (nextOpen) {
          restoreTriggerFocus.current = true;
          openedThread.current = nextThread;
          if (trigger instanceof HTMLElement) {
            const messageId = trigger.dataset.replyMessageId;
            const photoIndex = trigger.dataset.replyPhotoIndex;
            triggerRef.current = messageId
              ? (document.querySelector<HTMLElement>(
                  `[data-message-id="${CSS.escape(messageId)}"]${photoIndex === undefined ? "" : `[data-photo-index="${CSS.escape(photoIndex)}"]`}`,
                ) ?? trigger)
              : trigger;
          }
        }
        isOpen.current = nextOpen;
        following.current = false;
        if (nextOpen) setMounted(true);
        setOpen(nextOpen);
      }}
    >
      <ReplyPreviewContext.Provider
        value={{
          activeSurfaceIds,
          inPreview: false,
          mounted: mounted && ready,
          reduceMotion,
          surfaces,
        }}
      >
        <div data-reply-preview-list style={listFadeStyle}>
          {messageGestures(children)}
        </div>
        {/* Portals cannot render on the server; show the same composer
                    inline until its portal container is available. */}
        <div
          ref={setComposerContainer}
          data-chat-composer-slot
          className="contents"
        >
          {!composerContainer && composer}
        </div>
        {composerContainer && (
          <Dialog.Portal
            keepMounted
            container={footer ?? composerContainer}
            className="contents"
          >
            {/* Keep the input and its glass material mounted in one place.
                        The popup stays visible as an ordinary input when closed. */}
            <Dialog.Popup
              onFocusCapture={(event) => {
                if (
                  !isOpen.current ||
                  beforeKeyboard.current ||
                  matchMedia("(min-width: 640px)").matches ||
                  !(event.target instanceof HTMLTextAreaElement)
                )
                  return;
                beforeKeyboard.current = {
                  left: window.scrollX,
                  top: window.scrollY,
                  height: window.visualViewport?.height ?? window.innerHeight,
                  width: window.innerWidth,
                };
              }}
              hidden={false}
              role={mounted ? "dialog" : undefined}
              aria-modal={mounted ? true : undefined}
              aria-describedby={undefined}
              initialFocus={false}
              finalFocus={false}
              className="pointer-events-none contents outline-none"
            >
              <AnimatePresence
                onExitComplete={() => {
                  if (isOpen.current) return;
                  actionsRef.current?.unmount();
                  setMounted(false);
                  setReady(false);
                  // Restore focus only after the source surfaces are visible.
                  requestAnimationFrame(() => {
                    if (!isOpen.current && restoreTriggerFocus.current) {
                      triggerRef.current?.focus({
                        preventScroll: true,
                      });
                    }
                  });
                }}
              >
                {open ? (
                  <Fragment key="reply-preview">
                    <motion.div
                      initial={false}
                      data-reply-preview-stage
                      style={{
                        visibility: ready ? undefined : "hidden",
                      }}
                      className="fixed inset-y-0 left-0 isolate z-10 w-full overflow-hidden [contain:paint]"
                    >
                      <Dialog.Backdrop
                        data-reply-preview-backdrop
                        className="pointer-events-auto absolute inset-0"
                      />
                      <Dialog.Viewport
                        ref={scrollRef}
                        // Presence owns mounting; the stage's visibility
                        // hides preparation without zeroing layout bounds.
                        hidden={false}
                        data-reply-preview-scroll
                        onWheel={stopFollowing}
                        onTouchMove={stopFollowing}
                        onPointerDown={(event) => {
                          stopFollowing();
                          if (
                            event.isPrimary &&
                            event.button === 0 &&
                            isPreviewBackground(
                              event.target,
                              event.currentTarget,
                            )
                          )
                            outsidePress.current = {
                              id: event.pointerId,
                              x: event.clientX,
                              y: event.clientY,
                            };
                        }}
                        onPointerMove={(event) => {
                          const press = outsidePress.current;
                          if (
                            press &&
                            (press.id !== event.pointerId ||
                              Math.hypot(
                                event.clientX - press.x,
                                event.clientY - press.y,
                              ) > 8)
                          )
                            outsidePress.current = null;
                        }}
                        onPointerUp={(event) => {
                          const press = outsidePress.current;
                          if (
                            !press ||
                            !isPreviewBackground(
                              event.target,
                              event.currentTarget,
                            ) ||
                            event.pointerId !== press.id ||
                            Math.hypot(
                              event.clientX - press.x,
                              event.clientY - press.y,
                            ) > 8
                          )
                            outsidePress.current = null;
                        }}
                        onPointerCancel={() => {
                          outsidePress.current = null;
                        }}
                        onKeyDown={(event) => {
                          if (
                            [
                              "ArrowUp",
                              "ArrowDown",
                              "PageUp",
                              "PageDown",
                              "Home",
                              "End",
                              " ",
                            ].includes(event.key)
                          )
                            stopFollowing();
                        }}
                        onClick={(event) => {
                          const dismiss =
                            outsidePress.current &&
                            isPreviewBackground(
                              event.target,
                              event.currentTarget,
                            ) &&
                            !event.defaultPrevented;
                          outsidePress.current = null;
                          if (dismiss) {
                            actionsRef.current?.close();
                          }
                        }}
                        className="pointer-events-auto absolute inset-0 grid [scrollbar-width:none] overflow-x-hidden overflow-y-auto overscroll-contain pt-[max(112px,calc(var(--app-safe-top,env(safe-area-inset-top,0px))+100px))] pb-[calc(var(--home-composer-height,40px)+1.25rem+max(1rem,env(safe-area-inset-bottom,0px)-6px))] [overflow-anchor:none] sm:pb-[max(calc(var(--home-composer-height,40px)+36px),calc(var(--app-safe-bottom,env(safe-area-inset-bottom,0px))+var(--home-composer-height,40px)+20px))] [&::-webkit-scrollbar]:hidden"
                      >
                        <div
                          ref={contentRef}
                          data-reply-preview
                          className="pointer-events-none relative mx-auto mt-auto w-full max-w-100 pr-[max(1rem,var(--app-safe-right,env(safe-area-inset-right,0px)))] pl-[max(1rem,var(--app-safe-left,env(safe-area-inset-left,0px)))] text-(--message-foreground) outline-none"
                        >
                          <Dialog.Title className="sr-only">
                            {title}
                          </Dialog.Title>
                          <ReplyPreviewContext.Provider
                            value={{
                              activeSurfaceIds,
                              inPreview: true,
                              sendAnimating,
                              scrollToBottom,
                              onNavigate: () => {
                                restoreTriggerFocus.current = false;
                                actionsRef.current?.close();
                              },
                              mounted: mounted && ready,
                              reduceMotion,
                              surfaces,
                            }}
                          >
                            <div ref={layoutRef} className="flow-root">
                              <PreparedReplyContent
                                key={previewKey}
                                onReady={onPreviewReady}
                              >
                                {messageGestures(preview)}
                              </PreparedReplyContent>
                            </div>
                          </ReplyPreviewContext.Provider>
                        </div>
                      </Dialog.Viewport>
                    </motion.div>
                    <div className="pointer-events-none fixed inset-x-0 top-[calc(12px+var(--app-safe-top,env(safe-area-inset-top,0px)))] z-50 mx-auto flex w-full max-w-100 justify-end pr-[max(1rem,var(--app-safe-right,env(safe-area-inset-right,0px)))] pl-[max(1rem,var(--app-safe-left,env(safe-area-inset-left,0px)))] sm:top-[var(--app-safe-top,env(safe-area-inset-top,0px))]">
                      <ReplyPreviewCloseButton
                        buttonRef={closeRef}
                        ready={ready}
                      />
                    </div>
                  </Fragment>
                ) : null}
              </AnimatePresence>
              {composer}
            </Dialog.Popup>
          </Dialog.Portal>
        )}
      </ReplyPreviewContext.Provider>
    </Dialog.Root>
  );
}
