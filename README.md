# @ubx/docs-ui

Shared UI for ubx's two documentation sites, `ubx-docs-providers` and
`ubx-docs-users`.

Extracted only after both consumers existed. Three interfaces had to
change to be shareable at all, and one of those was not predicted:
`MobileSidebarToggle` imported `ProviderSidebar` directly, found only
when the second site failed to build. Extracting against a single call
site would have carried that coupling in unnoticed.

## What is here

| Export | Note |
|---|---|
| `CodeBlock` | Shiki-backed, async server component, build-time only |
| `themeA` | Theme A as a TextMate theme, CSS variables not hex |
| `Header` | Takes `nav` and optional `tabs` as props |
| `GlobalSearch` | Takes a generic `SearchEntry` |
| `MobileSidebarToggle` | Takes drawer contents as `children` |
| `ThemeToggle`, `Footer` | Unchanged from the originals |

## Theme A and the consuming site

`themeA` emits `var(--color-code-green)` and friends rather than hex, so
the consuming site's own `globals.css` keeps driving light and dark
through its existing `[data-theme]` contract with zero client JS. This
package never needs to know the actual colors.

The site must define: `--color-code-green`, `--color-code-red`,
`--color-code-yellow`, `--color-foreground`, `--color-foreground-muted`,
`--color-code-bg`.

Read `src/theme-a.ts` before changing the scope mapping. The three
overrides at the bottom were findable only by inspecting real token
output per language, and without them the naive mapping is visibly worse
than the hand-rolled tokenizer this replaces.
