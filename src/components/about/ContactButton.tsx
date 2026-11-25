"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ContactButton.module.css";

/*
 * "Contact me" button (ABOUT): opens a small pop-up with two ways to reach
 * Miguel, WhatsApp (straight into the chat) and e-mail.
 *
 * Where to change them: WHATSAPP (digits only, with country code) and EMAIL.
 * It stays an <a> so ABOUT's box reveal treats it like the other buttons.
 */
const WHATSAPP = "5521967849102";
const EMAIL = "miguel@dario-motion.com";
/** The e-mail opens ready to send: address, subject and a first line filled in. */
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent("Project inquiry")}&body=${encodeURIComponent("Hi Miguel,

")}`;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c.6.3 1.1.4 1.5.5a3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function ContactButton({ className, dotClass, label }: { className: string; dotClass: string; label: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const lenis = (window as unknown as { lenis?: { stop: () => void; start: () => void } }).lenis;
    lenis?.stop();
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      lenis?.start();
    };
  }, [open]);

  return (
    <>
      <a
        href="#contact"
        className={className}
        data-magnetic
        aria-haspopup="dialog"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <span className={dotClass} aria-hidden="true" />
        {label}
      </a>
      {open &&
        createPortal(
          <div className={styles.backdrop} onClick={() => setOpen(false)}>
            <div
              className={styles.panel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="contact-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" className={styles.close} aria-label="Close" onClick={() => setOpen(false)} autoFocus>
                ✕
              </button>
              <p className={styles.label}>[ Contact ]</p>
              <h2 id="contact-title" className={styles.title}>
                Let&apos;s talk
              </h2>
              <div className={styles.options}>
                <a className={styles.option} href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                  <span className={styles.icon} data-kind="whatsapp">
                    <WhatsAppIcon />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.optionTitle}>WhatsApp</span>
                    <span className={styles.optionSub}>+55 21 96784-9102</span>
                  </span>
                </a>
                <a className={styles.option} href={MAILTO}>
                  <span className={styles.icon} data-kind="mail">
                    <MailIcon />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.optionTitle}>E-mail</span>
                    <span className={styles.optionSub}>{EMAIL}</span>
                  </span>
                </a>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
