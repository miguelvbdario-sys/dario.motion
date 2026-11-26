"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PT } from "@/content/pt";
import { EN } from "@/content/en";

/*
 * Site language (EN / PT-BR).
 *
 * Each page is written in one language (its "source") and the other comes from
 * a dictionary keyed by the source text:
 *   - main page: written in English, Portuguese in src/content/pt.ts
 *   - course page: written in Portuguese, English in src/content/en.ts
 * A text without an entry stays as written, so nothing ever breaks.
 *
 *   const t = useT();   t("Contact me")   → "Fale comigo" in PT
 *   <T>Contact me</T>
 *
 * Default language = the page's source (main EN, course PT). Once the visitor
 * picks one with the switch, it is remembered (localStorage) on every page.
 */
export type Lang = "en" | "pt";
const KEY = "site-lang";

type Ctx = { lang: Lang; source: Lang; setLang: (l: Lang) => void };
const LangContext = createContext<Ctx>({ lang: "en", source: "en", setLang: () => {} });

export function LangProvider({ source = "en", children }: { source?: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(source);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "pt" || saved === "en") setLangState(saved);
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

  return <LangContext.Provider value={{ lang, source, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Returns t(text): the text in the current language (if the dictionary has it). */
export function useT() {
  const { lang, source } = useContext(LangContext);
  return useCallback(
    (s: string) => {
      if (lang === source) return s;
      const dict = lang === "pt" ? PT : EN;
      return dict[s] ?? s;
    },
    [lang, source],
  );
}

/** Translated text as a component. */
export function T({ children }: { children: string }) {
  return <>{useT()(children)}</>;
}

/**
 * A whole content object (from src/content) in the current language: every
 * string inside goes through t(). Paths, ids and numbers never match a
 * dictionary entry, so they pass through unchanged.
 */
export function useTr<D>(data: D): D {
  const t = useT();
  return useMemo(() => {
    const walk = (v: unknown): unknown => {
      if (typeof v === "string") return t(v);
      if (Array.isArray(v)) return v.map(walk);
      if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
        const o: Record<string, unknown> = {};
        for (const k in v) o[k] = walk((v as Record<string, unknown>)[k]);
        return o;
      }
      return v;
    };
    return walk(data) as D;
  }, [data, t]);
}
