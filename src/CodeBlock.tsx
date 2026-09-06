import { codeToHtml } from "shiki";
import { themeA, isSupportedLang } from "./theme-a";

// Shiki-backed, replacing the hand-rolled tokenizer both sites used to
// carry a copy of. That tokenizer's own comment already named a real
// highlighting library as the honest long-term answer; six languages
// across two consumers is past where hand rolling pays.
//
// This is an async server component. Both sites statically export, so
// Shiki runs at build time only and contributes nothing to the client
// bundle.
//
// Two behaviours are strictly better than what it replaces, both
// verified against real token output rather than assumed:
//   - JSON keys render yellow. The old regex matched quoted strings
//     first, so keys came out red, which theme A reserves for string
//     literals.
//   - HCL attribute names render yellow. The old property rule only
//     recognised `name:`, so HCL's `name =` was left plain.
export async function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const trimmed = code.replace(/\n$/, "");

  // An unknown language renders in the same code surface, uncoloured,
  // rather than being forced through a grammar built for something else.
  if (!isSupportedLang(lang)) {
    return (
      <pre className="overflow-x-auto rounded-2xl bg-code-bg p-4 text-sm leading-relaxed">
        <code className="font-mono-tabular text-foreground">{trimmed}</code>
      </pre>
    );
  }

  const html = await codeToHtml(trimmed, {
    lang,
    theme: themeA,
  });

  // Shiki emits its own <pre class="shiki">; the wrapper below keeps the
  // surface, radius and spacing identical to what both sites already
  // render, so the swap is invisible outside the token colors themselves.
  return (
    <div
      className="overflow-x-auto rounded-2xl bg-code-bg p-4 text-sm leading-relaxed [&_pre]:m-0 [&_code]:font-mono-tabular"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
