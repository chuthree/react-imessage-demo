import ProfileGlassSurface from "../components/ProfileGlassSurface";
import { useTranslations } from "use-intl";
import avatar from "../assets/home-avatar.webp";

// Motion Primitives' top-facing masks; omit the original zero-blur layer.
const blurLayers = Array.from({ length: 7 }, (_, index) => {
  const layer = index + 1;
  const stops = [layer, layer + 1, layer + 2, layer + 3]
    .map(
      (stop, i) =>
        `${i === 1 || i === 2 ? "#fff" : "transparent"} ${(stop / 9) * 100}%`,
    )
    .join(", ");
  const mask = `linear-gradient(0deg, ${stops})`;
  const blur = `blur(${layer * 0.25}px)`;
  return {
    maskImage: mask,
    WebkitMaskImage: mask,
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
  };
});

export default function ProfileHeader() {
  const t = useTranslations("Demo");
  return (
    <>
      <div
        data-profile-blur
        className="pointer-events-none fixed inset-x-0 top-0 z-[39] hidden h-[calc(var(--app-safe-top,0px)+82px)] sm:block"
      >
        {blurLayers.map((style, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="absolute inset-0 [@media(prefers-reduced-transparency:reduce)]:hidden"
            style={style}
          />
        ))}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(var(--home-background-rgb)/0.8)_0%,rgb(var(--home-background-rgb)/0.45)_40%,rgb(var(--home-background-rgb)/0.12)_70%,rgb(var(--home-background-rgb)/0)_100%)]"
        />
      </div>
      <div
        data-profile-header
        className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-[calc(12px+var(--app-safe-top,env(safe-area-inset-top,0px)))] sm:pt-[var(--app-safe-top,env(safe-area-inset-top,0px))]"
      >
        <div className="relative z-10 select-none">
          <span className="flex flex-col items-center">
            <div className="relative z-20 size-[59px] overflow-hidden rounded-full">
              <img
                src={avatar}
                alt={t("avatar")}
                width={59}
                height={59}
                fetchPriority="high"
                className="size-full object-cover"
              />
            </div>
            <ProfileGlassSurface className="pointer-events-auto relative z-10 -mt-[5.5px] inline-flex">
              <button
                type="button"
                aria-label={t("profileButton")}
                className="relative z-10 flex min-h-[30px] cursor-pointer touch-manipulation items-center justify-center gap-[3px] rounded-[20px] border-0 bg-transparent pt-[3px] pr-[10px] pb-[4px] pl-[13px] text-[17px] leading-none font-bold tracking-[-0.015em] text-[var(--home-glass-foreground,#0a0a0a)] [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007aff]"
              >
                <span>{t("name")}</span>
                <svg
                  className="shrink-0 text-[#8e8e93]/70"
                  width="11"
                  height="15"
                  viewBox="0 0 11 15"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3.5 2.25 6 7.5 3.5 12.75"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </ProfileGlassSurface>
          </span>
        </div>
      </div>
    </>
  );
}
