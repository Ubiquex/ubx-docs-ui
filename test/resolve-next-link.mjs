// Resolution hooks so Node can import the compiled dist directly.
//
// Two things stand in the way, both about resolution only. Neither fakes
// any behaviour, so a test using them is still exercising the real
// shipped code.
//
// 1. dist/MobileNav.js imports "next/link". Next ships
//    node_modules/next/link.js but declares no "./link" entry in its
//    exports map, so a bundler resolves the specifier and Node's ESM
//    resolver does not. Mapped onto Next's own real file rather than a
//    stand-in, so if Next changes what that module is, this fails loudly
//    instead of quietly testing a fiction.
//
// 2. The dist's own relative imports are extensionless ("./ThemeToggle"),
//    because tsconfig uses moduleResolution: bundler and tsc emits the
//    specifier as written. That is fine for every real consumer, since
//    all three sites are Next apps and a bundler resolves it, but it is
//    not valid ESM for Node, which requires the extension. Worth knowing
//    about the package rather than only about this test: the published
//    dist is not natively importable by Node today.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/link") {
    return { url: pathToFileURL(require.resolve("next/link")).href, shortCircuit: true };
  }
  // Extensionless relative specifier from inside dist. Only ever adds
  // ".js" when that file actually exists, so a genuinely missing module
  // still reports as missing rather than being silently rewritten.
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.includes("/dist/") &&
    !/\.[a-z]+$/i.test(specifier)
  ) {
    const candidate = new URL(`${specifier}.js`, context.parentURL);
    if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
