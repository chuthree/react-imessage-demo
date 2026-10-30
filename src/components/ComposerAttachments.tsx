import {
  FloatingFocusManager,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { Plus } from "lucide-react";
import { useTranslations } from "use-intl";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import ProfileGlassSurface from "./ProfileGlassSurface";
import { useContainedViewportLocked } from "./ContainedViewport";
import { useTheme } from "../home/HomeThemeProvider";
import cameraIcon from "../assets/composer-camera.webp";
import photosIcon from "../assets/composer-photos.webp";
import {
  capsulePressMotion,
  capsuleReducedPressMotion,
  glassPressMotion,
} from "./capsuleMotion";

// Drive content and glass geometry together to avoid ResizeObserver lag.
export default function ComposerAttachments({
  onCamera,
  onPhotos,
  disabled = false,
}: {
  onCamera: () => void;
  onPhotos: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Composer");
  const { resolvedTheme } = useTheme();
  const glassMotion = glassPressMotion(resolvedTheme === "dark");
  const [expanded, setOpen] = useState(false);
  const open = expanded && !disabled;
  useEffect(() => {
    // Close any open menu when chat pauses; restoring chat must not reopen it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (disabled) setOpen(false);
  }, [disabled]);
  const locked = useContainedViewportLocked();
  const reduceMotion = useReducedMotion();
  const pressMotion = reduceMotion
    ? capsuleReducedPressMotion
    : capsulePressMotion(40, 40);
  const progress = useMotionValue(0);
  const [frame, setFrame] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { refs, context } = useFloating({ open, onOpenChange: setOpen });
  const click = useClick(context);
  const dismiss = useDismiss(context, {
    enabled: !locked,
    outsidePressEvent: "pointerdown",
    capture: { outsidePress: true },
    outsidePress: (event) => {
      // Consume the outside press before parent dialogs or controls handle it.
      event.preventDefault();
      event.stopPropagation();
      return true;
    },
  });
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);
  useEffect(() => {
    const target = open ? 1 : 0;
    if (progress.get() === target) return;

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
      });
    });
    return () => {
      cancelAnimationFrame(startFrame);
      animation?.stop();
    };
  }, [open, progress, reduceMotion]);
  const size = { width: 40 + 152 * frame, height: 40 + 84 * frame };

  return (
    <motion.div
      inert={disabled}
      initial={false}
      tabIndex={-1}
      animate={glassMotion.animate}
      whileTap={
        disabled
          ? undefined
          : {
              ...(!open ? pressMotion.whileTap : {}),
              ...glassMotion.whileTap,
            }
      }
      transition={{
        ...pressMotion.transition,
        ...glassMotion.transition,
      }}
      className="pointer-events-auto relative z-40 size-10 shrink-0 origin-center"
    >
      <button
        ref={(node) => {
          triggerRef.current = node;
          refs.setReference(node);
        }}
        type="button"
        aria-label={t("add")}
        tabIndex={open ? -1 : 0}
        className="absolute inset-0 touch-manipulation rounded-full outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#007aff]"
        {...getReferenceProps()}
      />
      <div
        style={{ left: -14 * frame, bottom: 6 * frame }}
        className={`absolute bottom-0 left-0 ${open ? "" : "pointer-events-none"}`}
      >
        <ProfileGlassSurface
          className="block!"
          size={size}
          radius={20 + 4 * frame}
          material="frosted"
          materialProgress={frame}
        >
          <div className="absolute bottom-0 left-0 h-[124px] w-48">
            <span
              aria-hidden="true"
              style={{
                opacity: 1 - frame,
                left: 14 * frame,
                bottom: -6 * frame,
              }}
              className="pointer-events-none absolute bottom-0 left-0 flex size-10 items-center justify-center text-[var(--home-glass-foreground,#1c1c1e)]"
            >
              <Plus data-composer-attachment-icon size={24} />
            </span>
            <FloatingFocusManager
              context={context}
              disabled={!open || locked}
              initialFocus={panelRef}
              modal
              outsideElementsInert
              visuallyHiddenDismiss={t("closeAttachments")}
              returnFocus={triggerRef}
            >
              <div
                ref={(node) => {
                  panelRef.current = node;
                  refs.setFloating(node);
                }}
                inert={!open}
                style={{ opacity: frame }}
                className="absolute inset-0 flex flex-col gap-2 px-2 py-2.5 outline-none"
                {...getFloatingProps({
                  "aria-label": t("add"),
                })}
              >
                {[
                  {
                    label: t("camera"),
                    icon: cameraIcon,
                    action: onCamera,
                  },
                  {
                    label: t("photos"),
                    icon: photosIcon,
                    action: onPhotos,
                  },
                ].map(({ label, icon, action }) => (
                  <motion.button
                    key={label}
                    type="button"
                    whileTap={reduceMotion ? { opacity: 0.7 } : { scale: 0.96 }}
                    transition={{
                      duration: 0.15,
                      ease: [0.23, 1, 0.32, 1],
                    }}
                    onClick={() => {
                      // Release outside inert before opening the native file picker.
                      flushSync(() => setOpen(false));
                      action();
                    }}
                    className="grid min-h-12 w-full touch-manipulation grid-cols-[36px_minmax(0,1fr)] items-center justify-start gap-4 rounded-xl px-2 text-left text-[22px] leading-7 text-[var(--home-glass-foreground,#1c1c1e)] outline-none focus-visible:outline-2 focus-visible:outline-[#007aff]"
                  >
                    <img
                      src={icon}
                      alt=""
                      width={36}
                      height={36}
                      loading="eager"
                      draggable={false}
                      className="size-9 shrink-0 rounded-full"
                    />
                    <span>{label}</span>
                  </motion.button>
                ))}
              </div>
            </FloatingFocusManager>
          </div>
        </ProfileGlassSurface>
      </div>
    </motion.div>
  );
}
