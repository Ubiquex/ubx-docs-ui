# CLAUDE.md -- ubx-docs-ui

## What this is

The shared UI for both `ubx` documentation sites (UBI-247), published to
npm as `@ubx/docs-ui`. Consumed by
[`ubx-docs-users`](https://github.com/Ubiquex/ubx-docs-users)
(docs.ubiquex.io) and
[`ubx-docs-providers`](https://github.com/Ubiquex/ubx-docs-providers)
(providers.ubiquex.io). It holds no content and no routes: components,
the syntax highlighting theme, and the page shell.

## The two rules that exist because they were broken

**1. A shared library does not produce shared output unless the
consuming site's CSS build can see it.** Tailwind v4 auto-detects
sources and skips `node_modules`, so every utility class used only
inside this package was never generated. Both sites shipped with the
shared header and footer partly unstyled, and they diverged from each
other because a class survived only where the consuming site happened to
use it in its own local code too.

Each site carries `@source "../node_modules/@ubx/docs-ui/dist";` in its
`globals.css`. Any new class introduced here depends on that line. If a
component renders unstyled in a consuming site, check this before
anything else.

**2. No component may carry a specific site's identity.** `Footer` once
hardcoded the provider site's tagline and rendered "Reference content is
generated from each provider's own real schema, not hand-written" on 137
hand-written pages. `MobileSidebarToggle` hardcoded "Services", AWS
provider vocabulary, in its drawer heading and both aria-labels.

Both survived an audit that read each component, because wrong prose
renders exactly like right prose. `test/no-site-identity.test.mjs`
replaces reading with a mechanical scan: no literal URLs anywhere, and
every user-visible string on a short allowlist with a stated reason. It
reads four shapes (JSX text, attributes, object properties, default
parameter values), each added after one slipped past the others. If you
add a user-visible string, it must be true on every consuming site or it
must be a prop.

## Composition lives here, not just the parts

`PageShell` owns the arrangement: header, optional sidebar rail, main
column, footer. It exists because sharing `Header`/`Footer`/
`GlobalSearch` individually left each site assembling them, and the two
had already drifted (`lg:grid-cols-[280px_1fr]` against `flex gap-10`).
Aligning the two layouts by hand would have fixed one instance and left
the gap open.

`searchPlacement` distinguishes a landing page (`"hero"`, full size,
under `intro`) from a content page (`"header"`, compact, beside the
theme toggle). `THEME_INIT_SCRIPT` is exported separately because it
must run in `<head>` before hydration and cannot be a nested component.

## Versioning

Both sites pin with a caret, and on a `0.x` version npm's caret does not
cross the minor. So a new minor needs an explicit bump in each site;
this is how the provider site sat on `0.1.0` for a while after `0.2.0`
shipped. Publishing is `publish.yml`, manual dispatch, which refuses to
republish an existing version and verifies against the real registry
rather than its own exit status.

`0.3.0` exists in git history but was never published: `0.4.0`
superseded it before a release was cut.

## Git rules

PR-only, never self-merge, matching every repo in this org except
`ubiquex` itself and `ubiquex-docs`. Before pushing more commits to a
branch with an open PR, confirm it is STILL open (`gh pr view <n> --json
state`) -- a merged PR reports `mergeable=UNKNOWN mergeStateStatus=UNKNOWN`,
identical to "not yet computed", and `state` is the only field that
separates them. NO AI attribution anywhere in commits or PR bodies.

## Real, working commands

```bash
npm run typecheck
npm test                      # the site-identity scan
npm run build                 # cleans dist first; tsc does not
node scripts/check-package.mjs # what npm would actually ship, is it usable
```
