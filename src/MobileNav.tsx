"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NavLink } from "./Header";

// The header's destination nav is `hidden md:flex`, so below 768px it was
// simply gone. Measured on all three sites: navDisplay "none", and the
// only visible header link was the logo. There was no route to Install,
// Documentation, Tutorials, Providers or Blog on a phone, anywhere.
//
// Same two-state open/close as MobileSidebarToggle, and for the same
// reason: closing flips `visible` immediately so the transition can play,
// and the drawer only leaves the DOM once it has had time to finish.
const TRANSITION_MS = 200;

export function MobileNav({ nav, githubUrl }: { nav: NavLink[]; githubUrl?: string }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    // Escape closes it. A drawer with no keyboard exit is a trap for
    // anyone not using a pointer.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted]);

  function open() {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }
  function close() {
    setVisible(false);
    setTimeout(() => setMounted(false), TRANSITION_MS);
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Open navigation"
        aria-expanded={mounted}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-foreground-muted hover:bg-surface hover:text-primary md:hidden"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {mounted && (
        <div role="dialog" aria-modal="true" aria-label="Navigation" className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={close}
            className={
              "absolute inset-0 bg-foreground/40 transition-opacity duration-200 motion-reduce:transition-none " +
              (visible ? "opacity-100" : "opacity-0")
            }
          />
          <div
            className={
              "absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-1 overflow-y-auto bg-background p-5 shadow-lg " +
              "transition-transform duration-200 ease-out motion-reduce:transition-none " +
              (visible ? "translate-x-0" : "translate-x-full")
            }
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close navigation"
              className="mb-3 flex h-8 w-8 items-center justify-center self-end rounded text-foreground-muted hover:bg-surface hover:text-primary"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            {nav.map((item) =>
              item.href.startsWith("/") ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  className={item.current ? "py-2 text-primary" : "py-2 text-foreground-muted hover:text-primary"}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  className={item.current ? "py-2 text-primary" : "py-2 text-foreground-muted hover:text-primary"}
                >
                  {item.label}
                </a>
              ),
            )}
            {githubUrl ? (
              <a
                href={githubUrl}
                className="mt-3 rounded-full bg-primary px-4 py-2 text-center text-sm text-primary-foreground"
              >
                Star us on GitHub
              </a>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
