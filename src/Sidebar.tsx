// The sidebar's group heading and its indented list of pages beneath.
//
// Presentation only. It deliberately does NOT try to be "the sidebar":
// the two real sidebars are not the same component and should not be.
// ProviderSidebar fetches a prebuilt index over the network, filters it,
// collapses service groups, tracks which one is open and scrolls the
// current one into view. DocSidebar reads a static list handed to it at
// build time and renders it. Merging those would mean carrying all of
// the first inside the second for no gain.
//
// What the two DO share is how a category reads against its children: a
// bold, small, uppercase heading, and the pages indented beneath it. That
// had been written twice, and the copies had already drifted. The docs
// sidebar's heading was font-medium in the muted colour and its pages
// were not indented at all, so its categories did not separate from what
// sat under them. This is the smallest piece that fixes that and cannot
// drift again.
//
// No hooks and no state, so it is safe to import from a server component
// or a client one.

export function SidebarSection({
  heading,
  className = "",
  children,
}: {
  /**
   * Group label, in the consuming site's own vocabulary. A prop rather
   * than anything this file knows about: the provider site's groups are
   * Resources and Data sources, the user docs site's are whatever its
   * section index page calls its categories.
   */
  heading: React.ReactNode;
  /** Vertical spacing, which is the caller's rhythm rather than this component's. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // pl-1 lives here rather than on a wrapper around several sections,
    // which is where the provider sidebar used to put it. Same rendering,
    // and it means a lone section indents identically to one of several.
    <div className={`pl-1 ${className}`}>
      <h4 className="px-2 text-xs font-bold tracking-wide text-foreground uppercase">{heading}</h4>
      {children}
    </div>
  );
}

export function SidebarItemList({ children }: { children: React.ReactNode }) {
  return <ul className="mt-1 space-y-0.5">{children}</ul>;
}

/**
 * Class list for one page link inside a SidebarSection.
 *
 * The indent is `pl-6` against the heading's `px-2`. The negative margin
 * lets the active pill bleed to the rail's left edge while the text stays
 * on the indent, so the highlight reads as a full-width row rather than a
 * floating tablet.
 */
export function sidebarItemClass(active = false): string {
  const base = "-ml-1 block rounded-r-full py-1 pr-3 pl-6 text-sm";
  return active
    ? `${base} bg-primary/10 font-medium text-primary`
    : `${base} text-foreground-muted hover:bg-surface hover:text-primary`;
}
