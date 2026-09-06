import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

// Copied from ubx-docs-providers with ONE deliberate change, which is
// half the point of this slice (UBI-247): the nav is a prop rather than
// a module-level constant, and there is a second, optional tier below
// it for section tabs.
//
// The provider site's own copy hardcodes a six-entry NAV_LINKS array and
// has no second tier at all, because it never needed one. Extracting
// that version into @ubx/docs-ui would have meant extracting the shape
// that was about to change. Fixing the interface here first, against a
// real second consumer, is what makes the extraction in the next slice
// evidence-based rather than predicted.
//
// Two tiers, per the ticket: the header carries DESTINATIONS (other
// sites), the tab strip carries SECTIONS within this site. Keeping them
// visually and structurally distinct is what stops the reader confusing
// "leave this site" with "move within it". The provider site will pass
// `tabs={undefined}` when this is extracted and render exactly as it
// does today.

export type NavLink = {
  label: string;
  href: string;
  /** Marks the destination representing the current site. */
  current?: boolean;
};

export type SectionTab = {
  label: string;
  href: string;
};

export function Header({
  nav,
  tabs,
  activeTab,
  mobileMenu,
  search,
  showThemeToggle = true,
}: {
  nav: NavLink[];
  /** Omit entirely for a single-tier header, which is the provider site. */
  tabs?: SectionTab[];
  /** href of the active tab, matched by prefix so nested pages stay lit. */
  activeTab?: string;
  mobileMenu?: React.ReactNode;
  /**
   * Search control, rendered to the left of the theme toggle.
   *
   * In the header rather than in page content because the alternative
   * put it on exactly one page type per site: the provider site's home
   * page, and the user docs site's section landing pages, which are the
   * pages being removed. Every content page on both sites had no way to
   * search at all.
   */
  search?: React.ReactNode;
  /**
   * Render the theme toggle. Default true, which is every docs site.
   *
   * ubiquex-web opts out because it is dark-only: it defines no light
   * palette and no [data-theme] rules, so a toggle there would switch
   * between dark and dark. Shipping a control that does nothing is worse
   * than not shipping it.
   *
   * This is a recorded compromise, not a design position. The real fix
   * is a light palette for that site, at which point this prop should go
   * away rather than being set to true.
   */
  showThemeToggle?: boolean;
}) {
  return (
    <header className="border-b border-border bg-background">
      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
        {mobileMenu}
        <Link href="/" className="flex shrink-0 items-center">
          {/* Both variants always render; globals.css's own
              .logo-light/.logo-dark rules pick one via [data-theme], so
              the swap needs zero client JS. Same contract as the
              provider site. */}
          <img src="/logo/logo.png" alt="ubx" className="logo-light h-6 w-auto" />
          <img src="/logo/logo-dark.png" alt="ubx" className="logo-dark h-6 w-auto" />
        </Link>
        <div className="flex-1" />

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 md:flex">
          {nav.map((item) => {
            const className = item.current
              ? "text-sm text-primary"
              : "text-sm text-foreground-muted hover:text-primary";
            return item.href.startsWith("/") ? (
              <Link key={item.label} href={item.href} className={className}>
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className={className}>
                {item.label}
              </a>
            );
          })}
        </nav>

        {search ? <div className="w-40 shrink-0 sm:w-56 lg:w-64">{search}</div> : null}
        {showThemeToggle ? <ThemeToggle /> : null}
      </div>

      {tabs && tabs.length > 0 ? (
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => {
              // Prefix match, so /concepts/ledger keeps the Concepts tab
              // lit rather than only the exact section index.
              const active =
                activeTab === tab.href || activeTab?.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={
                    active
                      ? "-mb-px border-b-2 border-primary py-2 text-sm text-primary"
                      : "-mb-px border-b-2 border-transparent py-2 text-sm text-foreground-muted hover:text-primary"
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
