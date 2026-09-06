import type React from "react";
import { Header, type NavLink, type SectionTab } from "./Header";
import { Footer } from "./Footer";
import { GlobalSearch } from "./GlobalSearch";
import { MobileSidebarToggle } from "./MobileSidebarToggle";

// The page shell: header, optional sidebar rail, main column, footer.
//
// WHY THIS EXISTS RATHER THAN TWO ALIGNED LAYOUTS. Extracting Header,
// Footer, GlobalSearch and ThemeToggle individually left every consumer
// responsible for assembling them, and the two sites assembled them
// differently. Both had a near-identical rail (`mx-auto flex w-full
// max-w-7xl flex-1 gap-10 px-6 py-10` with a `hidden w-64 shrink-0
// lg:block` aside) written out separately, both mounted Footer in their
// own root layout, and each mounted GlobalSearch on exactly one page
// type. Nothing in the package could see any of that, so the pieces
// stayed shared while the arrangement drifted.
//
// Aligning the two layouts by hand would have fixed today's divergence
// and left the same gap open. The composition is the thing that has to
// live here.
//
// WHAT IS DELIBERATELY NOT HERE: <html>, <body> and the theme init
// script. Those belong to Next's root layout and cannot be rendered from
// a nested component. THEME_INIT_SCRIPT is exported separately for them,
// since it was duplicated verbatim in both sites.

export type PageShellProps = {
  nav: NavLink[];
  /** Omit for a single-tier header. The provider site omits it. */
  tabs?: SectionTab[];
  /** href of the active tab, prefix-matched so nested pages stay lit. */
  activeTab?: string;
  /**
   * Sidebar tree. When present the shell renders the two-column rail and
   * wires the same node into the mobile drawer, so the desktop and mobile
   * navigation can never disagree about what they contain.
   */
  sidebar?: React.ReactNode;
  /** Drawer heading, in the consuming site's own vocabulary. */
  sidebarLabel?: string;
  /**
   * Search placeholder. Presence of this prop is what mounts search.
   *
   * The placeholder is a prop because it is genuinely site-specific
   * ("Search resources and data sources..." against "Search the docs").
   * The input's styling is NOT a prop, which reverses the decision
   * GlobalSearch made when it was extracted. That decision was right at
   * the time: the two sites styled the box differently, and a default
   * would have silently imposed one site's look on the other. Now that
   * the shell owns the placement, one styling is the correct answer for
   * both, and leaving it configurable would just re-open the drift.
   */
  searchPlaceholder?: string;
  /**
   * Where the search box goes.
   *
   * "header" is right for a content page: search is a persistent tool
   * next to the theme toggle, out of the way of the page's own subject.
   * "hero" is right for a landing page, where search IS the subject and
   * the page has room to say so.
   *
   * A prop on the shell rather than two different pages assembling it,
   * because the difference is one of arrangement, not of components.
   * Both placements use the same GlobalSearch and the same tokens.
   */
  searchPlacement?: "header" | "hero";
  /**
   * Heading and lede, rendered above a hero search box.
   *
   * Only meaningful with searchPlacement "hero": the search sits between
   * the intro and `children`, and the shell cannot slot itself into the
   * middle of content it does not own. On a header-search page put the
   * heading in `children` as normal.
   */
  intro?: React.ReactNode;
  /** See Header's own showThemeToggle. Default true. */
  showThemeToggle?: boolean;
  /** See Header's own githubUrl. Omitted means no button. */
  githubUrl?: string;
  /** Footer identity. Required for the reason stated on Footer itself. */
  footer: {
    tagline: React.ReactNode;
    links: { label: string; href: string }[];
  };
  children: React.ReactNode;
};

/** Compact, for sitting beside the theme toggle. */
const HEADER_SEARCH_CLASS =
  "w-full rounded-full bg-field px-4 py-1.5 text-sm text-foreground outline-none " +
  "placeholder:text-foreground-muted focus:ring-2 focus:ring-primary/30";

/** Full size, for a landing page where search is the point. */
const HERO_SEARCH_CLASS =
  "w-full rounded-full bg-field px-5 py-3 text-base text-foreground outline-none " +
  "placeholder:text-foreground-muted focus:ring-2 focus:ring-primary/30";

export function PageShell({
  nav,
  tabs,
  activeTab,
  sidebar,
  sidebarLabel = "Navigation",
  searchPlaceholder,
  searchPlacement = "header",
  intro,
  showThemeToggle = true,
  githubUrl,
  footer,
  children,
}: PageShellProps) {
  const headerSearch =
    searchPlaceholder && searchPlacement === "header" ? (
      <GlobalSearch placeholder={searchPlaceholder} inputClassName={HEADER_SEARCH_CLASS} />
    ) : undefined;

  const heroSearch =
    searchPlaceholder && searchPlacement === "hero" ? (
      <div className="mx-auto mt-8 max-w-xl">
        <GlobalSearch placeholder={searchPlaceholder} inputClassName={HERO_SEARCH_CLASS} />
      </div>
    ) : null;

  return (
    <>
      <Header
        nav={nav}
        tabs={tabs}
        activeTab={activeTab}
        search={headerSearch}
        showThemeToggle={showThemeToggle}
        githubUrl={githubUrl}
        mobileMenu={
          sidebar ? (
            <MobileSidebarToggle label={sidebarLabel}>{sidebar}</MobileSidebarToggle>
          ) : undefined
        }
      />

      {sidebar ? (
        // No intro or hero search here on purpose: a page with a sidebar
        // is a content page, and a hero belongs to a landing page.
        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-10 px-6 py-10">
          <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      ) : (
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12">
          {intro}
          {heroSearch}
          {children}
        </main>
      )}

      <Footer tagline={footer.tagline} links={footer.links} />
    </>
  );
}

/**
 * Sets data-theme from localStorage before paint.
 *
 * Both sites carried this as a verbatim string constant in their own root
 * layout, which is duplication the package could not see. It has to be an
 * exported string rather than a component because it goes in <head> via
 * dangerouslySetInnerHTML and must run ahead of hydration: a React
 * component would run too late and the reader would see a flash of the
 * OS default before their stored choice applied.
 *
 * Absent or invalid storage leaves no attribute at all, which is exactly
 * "follow the OS".
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var stored = window.localStorage.getItem("ubx-docs-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();`;
