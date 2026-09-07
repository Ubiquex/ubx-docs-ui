"use client";

import { useState } from "react";

// A client shell around panels the SERVER already rendered.
//
// This exists because the same bug was written twice and fixed once.
// CodeBlock is an async server component. A client component may receive
// a server component as a prop, but it cannot import and render one
// itself, so a client tab strip that calls CodeBlock works on first
// paint (the server rendered it) and throws the moment a tab is pressed,
// because now the CLIENT has to render an async component:
//
//   An unknown Component is an async Client Component. Only Server
//   Components can be async at the moment.
//
// On the provider site that crashed the route on 26,490 pages, on every
// resource and data-source page, at every viewport. It read as a failed
// load because Next's error boundary replaced the page, and it looked
// mobile-only because that is where it happened to be noticed.
//
// The marketing site had already hit it and solved it locally. Two
// implementations, one correct, is exactly the drift this package exists
// to end, so the behaviour lives here now and the sites bring their own
// appearance.
//
// The rule this encodes, in one line: panels arrive as ReactNode, never
// as data this component turns into a CodeBlock.

export type CodeTab = {
  /** Tab label, and the identity used by defaultLabel. */
  label: string;
  /** Already rendered on the server. Never a component to call here. */
  panel: React.ReactNode;
};

export type CodeTabsClassNames = {
  root?: string;
  list?: string;
  tab?: string;
  tabActive?: string;
  panel?: string;
};

export function CodeTabs({
  tabs,
  defaultLabel,
  classNames = {},
  reserveHeight = false,
}: {
  tabs: CodeTab[];
  /**
   * Which tab opens, by label. Falls back to the first tab when unset or
   * unmatched.
   *
   * A label rather than an index, so a caller says which language it
   * means rather than depending on the order a data file happens to
   * serialise its keys in. The provider site opened on whichever key
   * came first in its examples JSON, which was nobody's decision.
   */
  defaultLabel?: string;
  classNames?: CodeTabsClassNames;
  /**
   * Reserve the height of the tallest panel so switching tabs does not
   * shift the content below.
   *
   * Off by default, because a site whose panels are a fixed height in
   * CSS does not need it and would pay for a second copy of every panel
   * for nothing. On, it renders an invisible stack of all panels in one
   * grid cell purely to size the box, and puts the active panel over it.
   *
   * That shape is deliberate and carried over from the provider site,
   * whose own comment recorded why: toggling only `visibility` on an
   * otherwise unchanged box can fail to repaint in WebKit, and each
   * panel's own overflow container establishes a stacking context on top
   * of that. Keeping the interactive path a plain conditional render
   * avoids both rather than chasing which one bites.
   */
  reserveHeight?: boolean;
}) {
  const initial = Math.max(
    0,
    tabs.findIndex((t) => t.label === defaultLabel),
  );
  const [active, setActive] = useState(initial);

  const tabButton = (t: CodeTab, i: number) => (
    <button
      key={t.label}
      type="button"
      role="tab"
      aria-selected={i === active}
      onClick={() => setActive(i)}
      className={(i === active ? classNames.tabActive : classNames.tab) ?? undefined}
    >
      {t.label}
    </button>
  );

  return (
    <div className={classNames.root}>
      <div role="tablist" className={classNames.list}>
        {tabs.map(tabButton)}
      </div>

      {reserveHeight ? (
        <div className="relative pt-3">
          <div className="invisible grid grid-cols-1" aria-hidden="true">
            {tabs.map((t) => (
              <div key={t.label} className="col-start-1 row-start-1 min-w-0">
                {t.panel}
              </div>
            ))}
          </div>
          <div className="absolute inset-0 min-w-0">{tabs[active]?.panel}</div>
        </div>
      ) : (
        tabs.map((t, i) => (
          // Hidden rather than unmounted: the panels are already
          // rendered, so unmounting re-runs nothing and only loses
          // scroll position inside a wide block.
          <div key={t.label} className={classNames.panel} hidden={i !== active}>
            {t.panel}
          </div>
        ))
      )}
    </div>
  );
}
