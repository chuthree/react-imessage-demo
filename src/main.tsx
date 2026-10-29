import { IntlProvider } from "use-intl";
import zh from "./messages/zh.json";
import en from "./messages/en.json";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import HomeThemeProvider from "./home/HomeThemeProvider";
import HomePhoneFrame from "./home/HomePhoneFrame";
import Demo from "./home/Demo";
import DemoControls from "./components/DemoControls";
import "./global.css";
import "./home/mobile.css";

const localeStorageKey = "imessage-demo:locale";

function App() {
  const [locale, setLocale] = useState<"zh" | "en">(() => {
    try {
      const saved = localStorage.getItem(localeStorageKey);
      if (saved === "zh" || saved === "en") return saved;
    } catch {
      // Browser language still works when storage is blocked.
    }
    return /^zh(?:-|$)/i.test(navigator.languages[0] || navigator.language)
      ? "zh"
      : "en";
  });
  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);
  return (
    <HomeThemeProvider>
      <IntlProvider
        locale={locale}
        messages={locale === "zh" ? zh : en}
        timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      >
        <HomePhoneFrame>
          <Demo />
        </HomePhoneFrame>
        <DemoControls
          onToggleLanguage={() => {
            const next = locale === "zh" ? "en" : "zh";
            setLocale(next);
            try {
              localStorage.setItem(localeStorageKey, next);
            } catch {
              // Switching remains available for the current page.
            }
          }}
        />
      </IntlProvider>
    </HomeThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
