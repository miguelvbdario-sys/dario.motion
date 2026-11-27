"use client";

import { setCalm, useCalm } from "@/lib/motion";
import { useT } from "@/lib/i18n";
import styles from "./MotionSwitch.module.css";

/*
 * "Turn off animations" switch, above the language switch (src/lib/motion.ts
 * explains what it turns off). Same look as the EN / PT pill: a label and a
 * small track whose red knob slides right when animations are off.
 */
export default function MotionSwitch({ className }: { className?: string }) {
  const t = useT();
  const calm = useCalm();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={calm}
      className={`${styles.switch} ${className ?? ""}`}
      data-on={calm || undefined}
      onClick={() => setCalm(!calm)}
    >
      <span className={styles.label}>{t("Turn off animations")}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.knob} />
      </span>
    </button>
  );
}
