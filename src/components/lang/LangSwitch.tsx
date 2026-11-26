"use client";

import { useLang } from "@/lib/i18n";
import styles from "./LangSwitch.module.css";

/*
 * EN / PT switch. A pill with a sliding red knob: click anywhere (or use the
 * keyboard) to flip the language. Color: --switch-color (red by default; the
 * course page sets its own).
 */
export default function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const pt = lang === "pt";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pt}
      aria-label={pt ? "Idioma: português. Mudar para inglês" : "Language: English. Switch to Portuguese"}
      className={`${styles.switch} ${className ?? ""}`}
      data-pt={pt || undefined}
      onClick={() => setLang(pt ? "en" : "pt")}
    >
      <span className={styles.knob} aria-hidden="true" />
      <span className={styles.opt} data-on={!pt || undefined}>EN</span>
      <span className={styles.opt} data-on={pt || undefined}>PT</span>
    </button>
  );
}
