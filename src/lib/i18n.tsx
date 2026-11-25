"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { PT } from "@/content/pt";

/*
 * Site language (EN / PT).
 *
 * The site is written in English. Portuguese comes from the dictionary in
 * src/content/pt.ts: each English text is a key, its value is the Portuguese.
 * A text without an entry stays in English, so nothing ever breaks.
 *
 *   const t = useT();   t("Contact me")   → "Fale comigo" in PT
 *   <T>Contact me</T>   (for server components)
 *
 * The choice is remembered in the browser (localStorage) and sets <html lang>.
 */
export type Lang = "en" | "pt";
const KEY = "site-lang";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    // First visit: English. Afterwards, the language the visitor picked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "pt") setLangState("pt");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {}
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Returns t(text): the Portuguese version when PT is on (if the dictionary has it). */
export function useT() {
  const { lang } = useContext(LangContext);
  return useCallback((s: string) => (lang === "pt" ? (PT[s] ?? s) : s), [lang]);
}

/** Translated text, usable inside server components. */
export function T({ children }: { children: string }) {
  return <>{useT()(children)}</>;
}
