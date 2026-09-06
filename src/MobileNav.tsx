"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavLink } from "./Header";
import { ThemeToggle } from "./ThemeToggle";

// The one mobile navigation control on all three sites.
//
// It used to be two. The header's destination nav is `hidden md:flex`,
// so below 768px it was gone, and this drawer was added to reach it.
// But the docs sites ALSO rendered MobileSidebarToggle, a second burger
// on the left opening a second drawer, for the section tree. A reader on
// a phone met two hamburger buttons that looked identical, opened from
// opposite edges, and each held half the navigation.
//
// So this component now holds both: destinations first, then the section
// tree when the page has one. MobileSidebarToggle is gone rather than
// kept alongside, because two implementations of one drawer is how the
// two drifted in the first place.
//
// Opens DOWNWARD from below the header rather than in from an edge. A
// side sheet reads as a separate surface that arrived over the page; a
// panel dropping from the bar reads as the bar itself expanding, which
// is what it is.
const TRANSITION_MS = 200;

export function MobileNav({
  nav,
  githubUrl,
  sidebar,
  sidebarLabel,
  showThemeToggle = true,
}: {
  nav: NavLink[];
  githubUrl?: string;
  /** The section tree, when the page has one. Rendered below the destinations. */
  sidebar?: React.ReactNode;
  sidebarLabel?: string;
  showThemeToggle?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  // Where the header actually ends, measured rather than assumed. The
  // header is one tier on the marketing site and two on the docs sites
  // (destinations plus a section tab strip), and a hardcoded offset
  // would drop the panel over the tab strip on exactly the sites that
  // have one.
  const [top, setTop] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mounted) return;
    // Escape closes it. A drawer with no keyboard exit is a trap for
    // anyone not using a pointer.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // Re-measure on resize: rotating a phone changes the header's
    // height whenever anything in it wraps.
    const onResize = () => {
      const header = buttonRef.current?.closest("header");
      if (header) setTop(header.getBoundingClientRect().bottom);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [mounted]);

  function open() {
    const header = buttonRef.current?.closest("header");
    setTop(header ? header.getBoundingClientRect().bottom : 0);
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function close() {
    setVisible(false);
    setTimeout(() => setMounted(false), TRANSITION_MS);
  }

  // Only an anchor with a real destination closes the drawer. Anything
  // else inside the injected tree, a disclosure toggle, a filter input,
  // a label, leaves it open so the reader can carry on navigating.
  //
  // `closest` rather than checking the target itself: a link's clickable
  // area is usually a span or an svg inside it, so the target is rarely
  // the anchor.
  function onTreeClick(e: React.MouseEvent) {
    const anchor = (e.target as Element | null)?.closest?.("a");
    const href = anchor?.getAttribute("href");
    if (href && href !== "#") close();
  }

  // Same rule as the desktop bar: one colour, and nothing changes with
  // the current page.
  const linkClass = "py-2 text-nav hover:text-nav-hover";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={mounted ? close : open}
        aria-label={mounted ? "Close navigation" : "Open navigation"}
        aria-expanded={mounted}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-foreground-muted hover:bg-surface hover:text-primary md:hidden"
      >
        {mounted ? (
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
            <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {mounted && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="fixed inset-x-0 bottom-0 z-50 md:hidden"
          style={{ top }}
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={close}
            className={
              "absolute inset-0 bg-foreground/40 transition-opacity duration-200 motion-reduce:transition-none " +
              (visible ? "opacity-100" : "opacity-0")
            }
          />
          {/* The clip. The panel below translates up by its own height
              when closed, and this box is what hides it while it does,
              so it slides out from behind the header rather than
              appearing over it. */}
          <div className="absolute inset-x-0 top-0 max-h-full overflow-hidden">
            <div
              className={
                "flex max-h-[calc(100vh-8rem)] flex-col gap-1 overflow-y-auto border-b border-border bg-background px-6 pt-4 pb-6 shadow-lg " +
                "transition-transform duration-200 ease-out motion-reduce:transition-none " +
                (visible ? "translate-y-0" : "-translate-y-full")
              }
            >
              {nav.map((item) =>
                item.href.startsWith("/") ? (
                  <Link key={item.label} href={item.href} onClick={close} className={linkClass}>
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.label} href={item.href} onClick={close} className={linkClass}>
                    {item.label}
                  </a>
                ),
              )}

              {sidebar ? (
                <div className="mt-4 border-t border-border pt-4">
                  {sidebarLabel ? (
                    <div className="mb-2 text-xs tracking-wide text-foreground-muted uppercase">
                      {sidebarLabel}
                    </div>
                  ) : null}
                  {/* Closes on NAVIGATION inside the tree, not on any tap.
                      The tree is the consuming site's own component and
                      knows nothing about this drawer, so the close is
                      still caught here by bubbling rather than wired
                      into every link. But this used to close on any
                      click at all, and a tree is not only links.

                      The provider site's service groups are <button>
                      disclosure toggles. Tapping one ran its own handler,
                      expanded the group, then bubbled to this element and
                      unmounted the drawer in the same tick, so the group
                      appeared to do nothing and no resource page was
                      reachable from a phone at all. Worse on reopening:
                      the drawer's sidebar is a separate instance from the
                      desktop rail, so its open-group state went with the
                      unmount and the group was collapsed again.

                      Closing the drawer is what a reader wants when they
                      have chosen a destination. A toggle is not a
                      destination, so only an anchor counts. */}
                  <div onClick={onTreeClick}>{sidebar}</div>
                </div>
              ) : null}

              {githubUrl ? (
                <a
                  href={githubUrl}
                  className="mt-4 rounded-full bg-primary px-4 py-2 text-center text-sm text-primary-foreground"
                >
                  Star us on GitHub
                </a>
              ) : null}

              {/* The theme control lives here rather than in the bar.
                  Three icons in a phone-width header crowded out the
                  logo and the burger, and theme is a preference a reader
                  sets once, not a destination. */}
              {showThemeToggle ? (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-foreground-muted">Theme</span>
                  <ThemeToggle />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
