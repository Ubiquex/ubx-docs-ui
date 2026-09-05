// Footer: Material style, a hairline divider and quiet text, not a
// heavy block -- the same restrained treatment already established
// for hairline dividers site-wide (globals.css's own --color-border).
//
// IDENTITY IS A PROP, NOT A DEFAULT, for the same reason it is on
// GlobalSearch, and this component is the proof that the reason is real.
//
// Extracted with the provider site's own identity hardcoded: a tagline
// reading "Reference content is generated from each provider's own real
// schema, not hand-written" and a License link pointing at
// ubx-docs-providers. Both were correct for the site they came from and
// silently wrong on the user docs site, where all 137 pages are
// hand-written MDX and the repo is a different one. The tagline did not
// merely fail to apply, it asserted the exact opposite of the truth on
// every page of the site.
//
// GlobalSearch was caught during extraction because its regression was
// visible (a pill turned into a rectangle). This one was not, because
// wrong prose looks exactly like right prose until someone reads it. So
// the rule cannot be "check carefully during extraction"; it has to be
// that the type system refuses to let a site inherit an identity it did
// not state. Hence both props are required and neither has a default.
export function Footer({
  tagline,
  links,
}: {
  /** The one-line statement of what this particular site's content is. */
  tagline: React.ReactNode;
  /** Footer destinations, stated per site rather than shared. */
  links: { label: string; href: string }[];
}) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-foreground-muted">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p>{tagline}</p>
          <nav className="flex items-center gap-5">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-primary">
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        {/* Genuinely shared: the same legal entity owns both sites. */}
        <p className="mt-4 text-center text-xs sm:text-left">&copy; 2026 Ubiquex</p>
      </div>
    </footer>
  );
}
