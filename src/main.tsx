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

function App() {
  const [locale, setLocale] = useState<"zh" | "en">("zh");
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
          onToggleLanguage={() => setLocale(locale === "zh" ? "en" : "zh")}
        />
      </IntlProvider>
    </HomeThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
