// Checks that the tarball npm would actually publish is consumable.
//
// WHY THIS IS SEPARATE FROM typecheck AND build. Those prove the source
// compiles. They say nothing about whether the thing that reaches the
// registry is usable, and those are different failures with very
// different blast radii. `files`, `main`, `types` and `exports` are four
// independent hand-maintained claims about what ends up in the tarball,
// none of which tsc validates. Get any of them wrong and the package
// publishes green, installs green, and fails at import time in both
// consuming sites at once.
//
// This package is the shared dependency of two sites and is published to
// npm, so that failure would land everywhere simultaneously and could
// not be fixed by reverting a commit: a published version is immutable
// and the fix is another release.
//
// It reads `npm pack --dry-run --json`, which reports exactly the file
// list npm would ship, rather than inspecting dist/ directly. Checking
// dist/ would pass while `files` excluded it.
//
// No React or Next needed. A real import smoke test would need the whole
// peer-dependency tree installed, and would mostly re-prove what tsc
// already proved. The failures worth catching here are structural.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const packed = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" }),
);
const shipped = new Set(packed[0].files.map((f) => f.path));

const problems = [];

// 1. Every path the manifest points at must actually be in the tarball.
const claims = [
  ["main", pkg.main],
  ["types", pkg.types],
  ...Object.entries(pkg.exports ?? {}).flatMap(([key, val]) =>
    typeof val === "string"
      ? [[`exports["${key}"]`, val]]
      : Object.entries(val).map(([cond, p]) => [`exports["${key}"].${cond}`, p]),
  ),
];

for (const [label, p] of claims) {
  if (!p) continue;
  const rel = p.replace(/^\.\//, "");
  if (!shipped.has(rel)) {
    problems.push(`${label} points at "${p}", which is not in the published tarball`);
  }
}

// 2. Every source module must have a compiled counterpart in the tarball.
//
// Catches a component that silently stops being emitted: tsconfig
// excludes it, a rename leaves the old name in index.ts, a file moves out
// of the compiled root. tsc is happy, the export is dead on arrival.
const sources = readdirSync("src").filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
for (const f of sources) {
  const base = f.replace(/\.tsx?$/, "");
  if (!shipped.has(`dist/${base}.js`)) {
    problems.push(`src/${f} has no dist/${base}.js in the published tarball`);
  }
  if (!shipped.has(`dist/${base}.d.ts`)) {
    problems.push(`src/${f} has no dist/${base}.d.ts in the published tarball`);
  }
}

// 3. Nothing named in index.ts may be missing from the tarball's own entry
// point. A stale re-export is a runtime error in every consumer.
const index = readFileSync("src/index.ts", "utf8");
for (const m of index.matchAll(/from\s+"\.\/([A-Za-z0-9_-]+)"/g)) {
  if (!shipped.has(`dist/${m[1]}.js`)) {
    problems.push(`src/index.ts re-exports "./${m[1]}", absent from the tarball`);
  }
}

// 4. A declared licence must actually ship.
//
// package.json said "license": "Apache-2.0" and the repo had no LICENSE
// file, so every published version of this package claimed a licence it
// did not include. npm adds LICENSE to the tarball automatically once it
// exists, even with a restrictive `files`, so the only thing that was
// missing was the file itself. Nothing surfaced it: npm does not warn,
// and the declaration alone is what most tooling reads.
if (pkg.license && !pkg.private) {
  const hasLicence = [...shipped].some((f) => /^LICEN[CS]E(\.|$)/i.test(f));
  if (!hasLicence) {
    problems.push(
      `package.json declares "license": "${pkg.license}" but no LICENSE file is in the tarball`,
    );
  }
}

console.log(`tarball: ${shipped.size} files, ${(packed[0].size / 1024).toFixed(1)} kB`);
console.log(`checked ${claims.length} manifest path claims and ${sources.length} source modules`);

if (problems.length) {
  console.error(`\n${problems.length} packaging problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log("ok: every published entry point resolves inside the tarball");
