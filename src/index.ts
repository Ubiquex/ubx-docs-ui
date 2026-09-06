// @ubx/docs-ui: the components genuinely shared by ubx's two
// documentation sites (ubx-docs-providers and ubx-docs-users).
//
// Extracted only after both consumers existed, deliberately. Three of
// these interfaces had to change to be shareable at all, and one of
// those was NOT predicted: MobileSidebarToggle imported ProviderSidebar
// directly, which was found when the second site failed to build.
// Extracting against a single call site would have carried that coupling
// into this package unnoticed.
export { CodeBlock } from "./CodeBlock";
export { themeA, isSupportedLang, SUPPORTED_LANGS } from "./theme-a";
export type { SupportedLang } from "./theme-a";
export { Header } from "./Header";
export type { NavLink, SectionTab } from "./Header";
export { GlobalSearch } from "./GlobalSearch";
export type { SearchEntry } from "./GlobalSearch";
export { ThemeToggle } from "./ThemeToggle";
export { Footer } from "./Footer";
export { MobileSidebarToggle } from "./MobileSidebarToggle";
export { PageShell, THEME_INIT_SCRIPT } from "./PageShell";
export type { PageShellProps } from "./PageShell";
export { MobileNav } from "./MobileNav";
