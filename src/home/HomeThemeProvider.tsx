import {
  createContext,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";
const query = "(prefers-color-scheme: dark)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getSnapshot = (): Theme =>
  window.matchMedia(query).matches ? "dark" : "light";
const getServerSnapshot = (): Theme => "light";
const ThemeContext = createContext<{
  resolvedTheme: Theme;
} | null>(null);

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme requires HomeThemeProvider");
  return theme;
}

export default function HomeThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.homeTheme = resolvedTheme;
    document
      .querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
      ?.setAttribute(
        "href",
        resolvedTheme === "dark"
          ? "/apple-touch-icon-dark.png"
          : "/apple-touch-icon.png",
      );
    if (!(window as Window & { __forceLightMode?: boolean }).__forceLightMode) {
      root.classList.toggle("dark", resolvedTheme === "dark");
    }
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
