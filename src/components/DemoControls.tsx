import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "use-intl";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";

const buttonClassName =
  "flex size-8 cursor-pointer items-center justify-center rounded-md text-neutral-400/70 transition-[background-color,color,scale] duration-150 ease-out hover:bg-black/5 hover:text-neutral-500 active:scale-95 active:text-neutral-600 dark:text-neutral-500/70 dark:hover:bg-white/5 dark:hover:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007aff]";

export default function DemoControls({
  onToggleLanguage,
}: {
  onToggleLanguage: () => void;
}) {
  const t = useTranslations("Demo");
  const locale = useLocale();
  const [rotation, setRotation] = useState(locale === "en" ? 1 : 0);
  return (
    <>
      <div className="fixed bottom-4 left-4 z-30 hidden sm:flex">
        <button
          type="button"
          aria-label={t("switchLanguage")}
          title={t("switchLanguage")}
          className={buttonClassName}
          onClick={() => {
            setRotation((value) => value + 1);
            onToggleLanguage();
          }}
        >
          <LanguageOrbitIcon rotation={rotation} />
        </button>
      </div>
    </>
  );
}

// Custom glyphs with the diagonal spacing of Hugeicons Languages.
function OrbitCharacter({
  angle,
  opposite = false,
}: {
  angle: ReturnType<typeof useMotionValue<number>>;
  opposite?: boolean;
}) {
  const direction = opposite ? -1 : 1;
  const transform = useTransform(angle, (value) => {
    const depth = direction * Math.sin(value);
    const scale = 1 / (1 - depth * 0.24);
    const x = 12 - direction * 4 * Math.cos(value) * scale;
    const y = 12.25 - direction * 3.75 * Math.cos(value) + depth * 3;
    // Keep both glyphs upright; only the rear glyph narrows in perspective.
    const width = scale * (1 - Math.max(0, -depth) * 0.2);
    return `translate(${x}px, ${y}px) scale(${width}, ${scale})`;
  });
  const opacity = useTransform(
    angle,
    (value) => 1 - Math.max(0, -direction * Math.sin(value)) * 0.6,
  );

  return (
    <motion.g
      style={{ transform, opacity }}
      data-character={opposite ? "A" : "文"}
    >
      {opposite ? (
        <path d="M-3.8 4.5 0-4.5 3.8 4.5M-2.55 1.5h5.1" />
      ) : (
        <path d="M-.55-4.8.15-3.6M-4.3-2.7h8.6M2.55-2.7C1.9.8-.7 3.4-4.25 4.65M-2.6-1.2C-1.3 1.5 1.15 3.65 4.3 4.65" />
      )}
    </motion.g>
  );
}

function LanguageOrbitIcon({ rotation }: { rotation: number }) {
  const angle = useMotionValue(rotation * Math.PI);
  const reducedMotion = useReducedMotion();
  const [chineseInFront, setChineseInFront] = useState(rotation % 2 !== 0);
  useMotionValueEvent(angle, "change", (value) => {
    setChineseInFront(Math.sin(value) > 0);
  });

  useEffect(() => {
    const target = rotation * Math.PI;
    if (angle.get() === target) {
      return;
    }

    const animation = animate(angle, target, {
      type: "spring",
      duration: reducedMotion ? 0 : 0.5,
      bounce: 0,
    });
    return () => animation.stop();
  }, [angle, reducedMotion, rotation]);

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-language-orbit=""
    >
      {/* Paint the nearer glyph last to preserve the orbital depth. */}
      <OrbitCharacter
        key={chineseInFront ? "A" : "文"}
        angle={angle}
        opposite={chineseInFront}
      />
      <OrbitCharacter
        key={chineseInFront ? "文" : "A"}
        angle={angle}
        opposite={!chineseInFront}
      />
    </svg>
  );
}
