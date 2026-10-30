import { useTranslations } from "use-intl";
import { useReducedMotion } from "framer-motion";

import { useSmoothCorners } from "@lisse/react";
import { ArrowUp, X } from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ChangeEvent,
  type Ref,
} from "react";
import ProfileGlassSurface from "./ProfileGlassSurface";
import ComposerAttachments from "./ComposerAttachments";
const cornerSmoothing = 0.6;
import { compressChatPhoto } from "../home/chatImages";
import { maxChatPhotos, type ChatPhoto } from "../lib/chat/photos";
import { deleteChatAnimations } from "../home/chatAnimations";
import { chatScroller } from "../home/chatSendAnimation";
import { prepareChatSounds } from "../home/chatSounds";

import type { MessageReplyTarget } from "../home/chat";
import styles from "./MessageComposer.module.css";

function SendButtonSurface() {
  const surfaceRef = useRef<HTMLSpanElement>(null);
  useSmoothCorners(
    surfaceRef,
    { radius: 14, smoothing: cornerSmoothing, preserveSmoothing: true },
    { autoEffects: false },
  );

  return (
    <span
      ref={surfaceRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[14px] bg-[#007aff]"
    />
  );
}

export type MessageComposerHandle = { send: (text: string) => boolean };

export default function MessageComposer({
  value: message,
  onChange,
  replyTarget = null,
  onSend,
  busy = false,
  onInputFocus,
  onBeforeInputFocus,
  inReplyPreview = false,
  sendRef,
  onBeforeSend,
}: {
  value: string;
  onChange: (value: string) => void;
  replyTarget?: MessageReplyTarget | null;
  onSend: (message: string, origin?: DOMRect, photos?: ChatPhoto[]) => boolean;
  busy?: boolean;
  onInputFocus?: () => void;
  onBeforeInputFocus?: () => boolean;
  inReplyPreview?: boolean;
  sendRef?: Ref<MessageComposerHandle>;
  onBeforeSend?: () => Promise<void>;
}) {
  const t = useTranslations("Composer");
  const reducedMotion = useReducedMotion();
  const viewportHeightBeforeFocus = useRef(0);
  const pendingSend = useRef<(() => void) | null>(null);
  const blockInputFocus = useRef(false);
  const [closingKeyboard, setClosingKeyboard] = useState(false);
  const [heightSnapKey, setHeightSnapKey] = useState(0);
  const [mobileHidden, setMobileHidden] = useState<boolean | null>(null);
  const visibilityInitialized = useRef(false);
  const revealed = useRef(false);
  const [entering, setEntering] = useState(false);
  useLayoutEffect(() => {
    const form = formRef.current;
    const thread = form
      ?.closest("[data-contained-viewport]")
      ?.querySelector("[data-home-thread]");
    let focusFrame = 0;
    const update = () => {
      const mobile = !matchMedia("(min-width: 640px)").matches;
      if (!mobile || inReplyPreview) {
        setEntering(false);
        setMobileHidden(false);
        return;
      }
      // Wait for the stable portal before deciding initial visibility.
      const host = form?.closest("[data-home-composer]");
      if (!form || !host) return;
      const anchor = thread?.querySelector("[data-composer-anchor]");
      // Use the fixed host, whose bounds do not scale with the reveal animation.
      const inChat = Boolean(
        anchor &&
        anchor.getBoundingClientRect().bottom + 20 <=
          host.getBoundingClientRect().top + 1,
      );
      const visible = Boolean(
        form.contains(document.activeElement) || pendingSend.current || inChat,
      );
      if (!revealed.current && visible) {
        revealed.current = true;
        // Restoring a page already at the bottom must not replay the entrance.
        setEntering(
          visibilityInitialized.current &&
            !matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
      }
      if (!visible) setEntering(false);
      setMobileHidden(!visible);
      visibilityInitialized.current = true;
    };
    const afterBlur = () => {
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(update);
    };
    update();
    document.addEventListener("scroll", update, true);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", afterBlur);
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    if (thread) observer.observe(thread);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("scroll", update, true);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", afterBlur);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [inReplyPreview]);
  const handleInputFocus = () => {
    const height = window.visualViewport?.height ?? window.innerHeight;
    if (
      !viewportHeightBeforeFocus.current ||
      document.documentElement.clientHeight - height < 100
    )
      viewportHeightBeforeFocus.current = height;
    if (matchMedia("(min-width: 640px)").matches) onInputFocus?.();
  };
  const messageLabel = replyTarget ? t("reply") : t("message");

  const [photos, setPhotos] = useState<
    {
      url: string;
      name: string;
      compressed?: ChatPhoto;
      failed?: boolean;
    }[]
  >([]);
  const [photoLimitExceeded, setPhotoLimitExceeded] = useState(false);
  const photoUrls = useRef(new Set<string>());
  const draftAnimations = useRef(new Map<string, string>());
  const cameraRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const hasPhotos = photos.length > 0;
  const photosPending = photos.some((photo) => !photo.compressed);
  const placeholder = hasPhotos
    ? t("photoPlaceholder")
    : replyTarget
      ? t("replyPlaceholder")
      : t("placeholder");
  const sendLabel = replyTarget ? t("sendReply") : t("sendMessage");
  const inputId = useId();
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const showSend = message.trim().length > 0 || hasPhotos;
  const keyboardOutline = keyboardFocus
    ? "focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[Highlight]"
    : "";

  const updateComposerHeight = useEffectEvent((height: number) => {
    const form = formRef.current;
    const viewport = form?.closest<HTMLElement>("[data-contained-viewport]");
    if (!form || !viewport) return;
    const scroller = chatScroller(form);
    // Follow composer resizing unless a send animation already controls scrolling.
    const atBottom =
      !scroller.animating() && scroller.bottom() - scroller.top() < 2;
    viewport.style.setProperty("--home-composer-height", `${height}px`);
    if (atBottom) scroller.scroll(scroller.bottom());
  });

  useLayoutEffect(() => {
    const form = formRef.current;
    const viewport = form?.closest<HTMLElement>("[data-contained-viewport]");
    if (!form || !viewport) return;
    updateComposerHeight(form.offsetHeight);
    const observer = new ResizeObserver(([entry]) => {
      updateComposerHeight(
        entry.borderBoxSize[0]?.blockSize ?? form.offsetHeight,
      );
    });
    observer.observe(form);
    return () => {
      observer.disconnect();
      viewport.style.removeProperty("--home-composer-height");
    };
  }, []);

  useEffect(() => {
    const urls = photoUrls.current;
    const animations = draftAnimations.current;
    return () => {
      pendingSend.current?.();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
      void deleteChatAnimations([...animations.values()]).catch(() => {});
      animations.clear();
    };
  }, []);

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    const remaining = Math.max(0, maxChatPhotos - photoUrls.current.size);
    setPhotoLimitExceeded(files.length > remaining);
    const selected = files.slice(0, remaining).map((file) => {
      const url = URL.createObjectURL(file);
      photoUrls.current.add(url);
      return { url, name: file.name };
    });
    setPhotos((previous) => [...previous, ...selected]);
    // The attachment menu pauses list following; resume it for the growing composer.
    if (selected.length) onInputFocus?.();
    for (const [index, photo] of selected.entries()) {
      void compressChatPhoto(files[index], photo.url)
        .then((compressed) => {
          if (!photoUrls.current.has(photo.url)) {
            if (compressed.animationId)
              void deleteChatAnimations([compressed.animationId]).catch(
                () => {},
              );
            return;
          }
          if (compressed.animationId)
            draftAnimations.current.set(photo.url, compressed.animationId);
          setPhotos((previous) =>
            previous.map((item) =>
              item.url === photo.url ? { ...item, compressed } : item,
            ),
          );
        })
        .catch(() => {
          if (!photoUrls.current.has(photo.url)) return;
          setPhotos((previous) =>
            previous.map((item) =>
              item.url === photo.url ? { ...item, failed: true } : item,
            ),
          );
        });
    }
    event.target.value = "";
  }

  function removePhoto(url: string) {
    setPhotoLimitExceeded(false);
    setPhotos((previous) => previous.filter((photo) => photo.url !== url));
    URL.revokeObjectURL(url);
    photoUrls.current.delete(url);
    const animationId = draftAnimations.current.get(url);
    if (animationId) void deleteChatAnimations([animationId]).catch(() => {});
    draftAnimations.current.delete(url);
  }

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Tab") setKeyboardFocus(true);
    };
    const handlePointerDown = () => setKeyboardFocus(false);

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);
  const submitting = useRef(false);
  const photoExitAnimations = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    if (hasPhotos) return;
    // Release the exit fill only after React has removed the draft photo nodes.
    photoExitAnimations.current.forEach((animation) => animation.cancel());
    photoExitAnimations.current = [];
  }, [hasPhotos]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      photoExitAnimations.current.forEach((animation) => animation.cancel());
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function submit(suggestion?: string) {
    const text = suggestion ?? message.trim();
    if (
      (!text && !hasPhotos) ||
      busy ||
      photosPending ||
      pendingSend.current ||
      submitting.current
    )
      return false;
    submitting.current = true;
    setClosingKeyboard(true);
    const send = async () => {
      let clearedDraft = false;
      try {
        await onBeforeSend?.();
        if (!alive.current) return;
        if (hasPhotos && !suggestion && !reducedMotion) {
          // Hold the composer height until the draft photos have dissolved.
          photoExitAnimations.current = Array.from(
            formRef.current?.querySelectorAll<HTMLElement>(
              "[data-composer-photo]",
            ) ?? [],
          ).map((photo) =>
            photo.animate(
              [
                {
                  transform: "scale(1)",
                  filter: "blur(0px)",
                  opacity: 1,
                  easing: "cubic-bezier(0.4, 0, 1, 1)",
                },
                {
                  transform: photos.length === 1 ? "scale(0.66)" : "scale(1)",
                  filter: "blur(12px)",
                  opacity: 0.4,
                  offset: 0.85,
                },
                {
                  transform: photos.length === 1 ? "scale(0.6)" : "scale(1)",
                  filter: "blur(16px)",
                  opacity: 0,
                },
              ],
              { duration: 120, fill: "forwards" },
            ),
          );
          await Promise.all(
            photoExitAnimations.current.map((animation) => animation.finished),
          ).catch(() => {});
          if (!alive.current) return;
        }
        const origin = formRef.current
          ?.querySelector<HTMLElement>("[data-chat-source]")
          ?.getBoundingClientRect();
        if (
          onSend(
            text,
            origin?.width ? origin : undefined,
            suggestion ? undefined : photos.map((photo) => photo.compressed!),
          ) &&
          !suggestion
        ) {
          onChange("");
          setPhotos([]);
          clearedDraft = true;
          setPhotoLimitExceeded(false);
          photoUrls.current.forEach((url) => URL.revokeObjectURL(url));
          photoUrls.current.clear();
          draftAnimations.current.clear();
        }
      } finally {
        if (!clearedDraft) {
          photoExitAnimations.current.forEach((animation) => animation.cancel());
          photoExitAnimations.current = [];
        }
        submitting.current = false;
        if (alive.current) setClosingKeyboard(false);
      }
    };
    if (matchMedia("(min-width: 640px)").matches) {
      void send();
      return true;
    }

    const visual = window.visualViewport;
    const input = formRef.current?.querySelector<HTMLTextAreaElement>(
      'textarea[name="message"]',
    );
    const currentHeight = visual?.height ?? window.innerHeight;
    const beforeFocus = viewportHeightBeforeFocus.current || currentHeight;
    const targetHeight =
      document.activeElement === input || beforeFocus - currentHeight > 100
        ? beforeFocus
        : currentHeight;
    let frame = 0;
    let previous = "";
    const cleanup = () => {
      cancelAnimationFrame(frame);
      visual?.removeEventListener("resize", schedule);
      visual?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
    const settled = () => {
      if (visual && visual.height < targetHeight - 1) return;
      const rect = formRef.current?.getBoundingClientRect();
      if (!rect) return;
      const position = `${visual?.height}:${visual?.offsetTop}:${window.scrollY}:${rect.top}:${rect.height}`;
      if (position !== previous) {
        previous = position;
        frame = requestAnimationFrame(settled);
        return;
      }
      cleanup();
      pendingSend.current = null;
      void send();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      previous = "";
      frame = requestAnimationFrame(settled);
    };
    pendingSend.current = cleanup;
    setClosingKeyboard(true);
    visual?.addEventListener("resize", schedule);
    visual?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    input?.blur();
    schedule();
    return true;
  }
  useImperativeHandle(sendRef, () => ({ send: (text) => submit(text) }));

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      !(event.metaKey || event.ctrlKey) ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229 ||
      event.repeat
    ) {
      return;
    }

    event.preventDefault();
    if (message.trim() || hasPhotos) event.currentTarget.form?.requestSubmit();
  }

  return (
    <form
      onContextMenu={(event) => event.preventDefault()}
      ref={formRef}
      inert={entering || mobileHidden !== false}
      aria-hidden={mobileHidden === true || undefined}
      data-mobile-hidden={mobileHidden !== false ? "" : undefined}
      data-visibility-pending={mobileHidden === null ? "" : undefined}
      data-entering={entering ? "" : undefined}
      onAnimationEnd={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.classList.contains(styles.controls)
        )
          setEntering(false);
      }}
      aria-label={
        replyTarget
          ? t("replyForm", { title: replyTarget.title })
          : t("contact")
      }
      onSubmit={handleSubmit}
      onFocusCapture={prepareChatSounds}
      className={`${styles.composer} pointer-events-none relative z-30 mx-auto flex w-full max-w-100 shrink-0 items-end justify-center gap-2 px-7 select-none sm:fixed sm:inset-x-0 sm:bottom-[max(1rem,calc(var(--app-safe-bottom,env(safe-area-inset-bottom,0px))-6px))]`}
    >
      <p id={`${inputId}-help`} className="sr-only">
        {hasPhotos
          ? t("photoHelp")
          : replyTarget
            ? t("replyHelp", { text: replyTarget.text })
            : t("help")}
      </p>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label={t("camera")}
        onChange={selectPhotos}
        className="hidden"
      />
      <input
        ref={photosRef}
        type="file"
        accept="image/*"
        multiple
        aria-label={t("photos")}
        onChange={selectPhotos}
        className="hidden"
      />
      <div className={styles.stage}>
        <div
          className={`${styles.controls} relative flex w-full min-w-0 items-end gap-2`}
        >
          <ComposerAttachments
            disabled={closingKeyboard}
            onCamera={() => cameraRef.current?.click()}
            onPhotos={() => photosRef.current?.click()}
          />
          <div
            inert={closingKeyboard}
            className={`${styles.capsule} pointer-events-none flex min-w-0 flex-1 justify-center`}
          >
            <ProfileGlassSurface
              className="pointer-events-none w-full origin-center"
              smoothing={0}
              animateHeight
              heightSnapKey={heightSnapKey}
              material={hasPhotos ? "frosted" : "clear"}
            >
              {hasPhotos && (
                <>
                  <div
                    role="group"
                    aria-label={t("selectedPhotos")}
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    className="pointer-events-auto flex touch-pan-x touch-pinch-zoom [scrollbar-width:none] gap-1.5 overflow-x-auto overscroll-x-contain p-1.5 [&::-webkit-scrollbar]:hidden"
                  >
                    {photos.map((photo) => (
                      <div
                        key={photo.url}
                        data-composer-photo
                        className="relative h-[156px] shrink-0 rounded-xl"
                      >
                        {/* Keep GIF previews animated unless reduced motion is enabled. */}
                        <img
                          src={
                            photo.compressed?.animationId && !reducedMotion
                              ? photo.url
                              : (photo.compressed?.url ?? photo.url)
                          }
                          alt={t("photoPreview", {
                            name: photo.name,
                          })}
                          draggable={false}
                          className="block h-full w-auto max-w-none rounded-xl"
                        />
                        <button
                          type="button"
                          aria-label={t("removePhoto", {
                            name: photo.name,
                          })}
                          onClick={() => removePhoto(photo.url)}
                          className="absolute top-1.5 right-1.5 flex size-[18px] touch-manipulation items-center justify-center rounded-full bg-[#565658] text-white outline-none before:absolute before:-inset-[13px] focus-visible:outline-2 focus-visible:outline-white"
                        >
                          <X size={14} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {photoLimitExceeded && (
                    <p
                      role="status"
                      className="px-4 pb-1 text-xs text-[var(--home-glass-foreground,#1c1c1e)]"
                    >
                      {t("photoLimit", {
                        count: maxChatPhotos,
                      })}
                    </p>
                  )}
                  {photos.some((photo) => photo.failed) && (
                    <p
                      role="status"
                      className="px-4 pb-1 text-xs text-[var(--home-glass-foreground,#1c1c1e)]"
                    >
                      {t("photoFailed")}
                    </p>
                  )}
                  <div className="mx-4 h-px bg-[var(--home-glass-foreground,#1c1c1e)]/15" />
                </>
              )}
              <div data-chat-source className="relative z-10 flex w-full">
                <label htmlFor={`${inputId}-input`} className="sr-only">
                  {messageLabel}
                </label>
                <textarea
                  id={`${inputId}-input`}
                  name="message"
                  aria-describedby={`${inputId}-help`}
                  value={message}
                  onFocus={handleInputFocus}
                  onPointerDown={(event) => {
                    blockInputFocus.current =
                      !matchMedia("(min-width: 640px)").matches &&
                      onBeforeInputFocus?.() === false;
                    if (blockInputFocus.current) {
                      event.preventDefault();
                      return;
                    }
                    if (
                      matchMedia("(min-width: 640px)").matches &&
                      document.activeElement === event.currentTarget
                    )
                      onInputFocus?.();
                  }}
                  onPointerUp={() => {
                    // Start after touchstart, which cancels scrolling when a gesture begins.
                    if (!matchMedia("(min-width: 640px)").matches)
                      onInputFocus?.();
                  }}
                  onTouchEnd={(event) => {
                    if (blockInputFocus.current) event.preventDefault();
                  }}
                  onMouseDown={(event) => {
                    if (blockInputFocus.current) event.preventDefault();
                  }}
                  onKeyDown={handleKeyDown}
                  onChange={(event) => {
                    setHeightSnapKey((key) => key + 1);
                    onChange(event.target.value);
                  }}
                  placeholder={placeholder}
                  rows={1}
                  maxLength={2000}
                  style={{ fieldSizing: "content" }}
                  className={`pointer-events-auto block max-h-32 min-h-[40px] min-w-0 flex-1 resize-none [scrollbar-width:none] rounded-[20px] bg-transparent py-2 pl-4 select-text placeholder-shown:select-none [&::-webkit-scrollbar]:hidden ${showSend ? "pr-16" : "pr-4"} text-[17px] leading-6 text-[var(--home-glass-foreground,#1c1c1e)] outline-none placeholder:text-[var(--home-glass-placeholder,#8e8e93)] ${keyboardOutline} focus-visible:outline-[#007aff]`}
                />
                {showSend && (
                  <button
                    type="submit"
                    disabled={busy || photosPending}
                    aria-label={sendLabel}
                    onPointerDown={(event) => event.preventDefault()}
                    onMouseDown={(event) => event.preventDefault()}
                    className={`pointer-events-auto absolute right-[6px] bottom-[6px] flex h-7 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-transparent text-white transition-opacity outline-none after:absolute after:inset-x-0 after:-inset-y-1.5 disabled:cursor-default disabled:opacity-40 ${keyboardOutline} focus-visible:outline-white active:opacity-70 motion-reduce:transition-none`}
                  >
                    <SendButtonSurface />
                    <ArrowUp
                      className="relative"
                      size={20}
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            </ProfileGlassSurface>
          </div>
        </div>
      </div>
    </form>
  );
}
