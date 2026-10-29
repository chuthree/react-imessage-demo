import {
  ContainedViewportContext,
  HomeComposerContainerContext,
} from "../components/ContainedViewport";
import {
  useSyncExternalStore,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import phoneImages from "./phoneImages.json";
import paths from "../../public/phone-clock/paths.json";
import { phoneClockLayout } from "./phoneClockLayout";

const subscribe = (notify: () => void) => {
  const query = matchMedia("(min-width: 640px)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const desktopSnapshot = () => matchMedia("(min-width: 640px)").matches;

export default function HomePhoneFrame({ children }: { children: ReactNode }) {
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, () => false);
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const layers = [
    ["frame", "darkFrame"],
    ["actionButton", "darkActionButton"],
    ["sideButton", "darkSideButton"],
    ["volumeUpButton", "darkVolumeUpButton"],
    ["volumeDownButton", "darkVolumeDownButton"],
  ] as const;

  return (
    <div
      data-home-phone-frame
      className="min-h-dvh bg-(--home-background) sm:flex sm:h-dvh sm:items-center sm:justify-center sm:overflow-clip sm:p-8"
    >
      <div
        data-home-phone-device
        className="relative w-full sm:aspect-[1293/2656] sm:w-(--home-frame-width) sm:shrink-0 sm:[zoom:min(1,calc((100dvh-64px)*1293/2656/430px))] sm:[--home-frame-width:430px]"
      >
        <div
          ref={setScreen}
          data-contained-viewport
          data-home-native-scroll={!desktop ? "" : undefined}
          className="@container/home sm:absolute sm:top-[calc(2.1084%-var(--home-screen-top-overlap))] sm:left-[calc(4.4084%-0.5px)] sm:h-[calc(96.4232%+var(--home-screen-top-overlap))] sm:w-[calc(91.3379%+1px)] sm:[transform:translate(0)] sm:bg-(--home-background) sm:[--app-safe-bottom:calc(var(--home-frame-width)*102/1293)] sm:[--app-safe-left:0px] sm:[--app-safe-right:0px] sm:[--app-safe-top:calc(var(--home-frame-width)*177/1293+var(--home-screen-top-overlap))] sm:[--app-viewport-height:calc(var(--home-frame-width)*2561/1293+var(--home-screen-top-overlap))] sm:[--home-screen-top-overlap:calc(var(--home-frame-width)*8/1293)] sm:[clip-path:inset(0_round_8.5%/3.92%)]"
        >
          <ContainedViewportContext.Provider value={desktop ? screen : null}>
            <HomeComposerContainerContext.Provider value={footer}>
              <div
                data-home-scroll
                className="sm:h-full sm:[scrollbar-width:none] sm:overflow-x-hidden sm:overflow-y-auto sm:overscroll-contain sm:[&::-webkit-scrollbar]:hidden"
              >
                {children}
              </div>
              <div
                ref={setFooter}
                data-home-composer
                className="pointer-events-none z-30 sm:contents"
              />
            </HomeComposerContainerContext.Provider>
          </ContainedViewportContext.Provider>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-[65] hidden aspect-[1179/177] select-none sm:block in-data-[home-theme=dark]:invert"
          >
            <div
              className="absolute inset-0 bg-size-[100%_100%] bg-no-repeat"
              style={{
                backgroundImage: `url("${phoneImages.status}")`,
                clipPath: "inset(0 0 0 70%)",
              }}
            />
            <svg viewBox="0 0 1179 177" className="absolute inset-0 size-full">
              {phoneClockLayout("09:41").map((glyph, index) => (
                <path
                  key={index}
                  d={(paths as Record<string, string>)[glyph.character]}
                  transform={`translate(${glyph.x} 106) scale(3 -3)`}
                  fill="#000"
                />
              ))}
            </svg>
          </div>
        </div>
        {layers.map(([light, dark]) => (
          <div
            key={light}
            aria-hidden="true"
            style={
              {
                "--frame-light": `url("${phoneImages[light]}")`,
                "--frame-dark": `url("${phoneImages[dark]}")`,
              } as CSSProperties
            }
            className="pointer-events-none absolute top-[-10.1657%] left-[-6.8832%] z-[70] hidden h-[120.2937%] w-[113.9985%] bg-size-[100%_100%] bg-no-repeat sm:block sm:[background-image:var(--frame-light)] sm:in-data-[home-theme=dark]:[background-image:var(--frame-dark)]"
          />
        ))}
      </div>
    </div>
  );
}
