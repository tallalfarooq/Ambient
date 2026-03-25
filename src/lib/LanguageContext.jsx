import { createContext, useContext, useState } from "react";
import { translations } from "./i18n";

const LanguageContext = createContext({ lang: "en", setLanguage: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("ambient_lang") || "en"; } catch { return "en"; }
  });

  const setLanguage = (l) => {
    setLang(l);
    try { localStorage.setItem("ambient_lang", l); } catch {}
  };

  const t = (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export default LanguageContext;