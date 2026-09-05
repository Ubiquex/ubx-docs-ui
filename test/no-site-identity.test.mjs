// Guards the one invariant that makes a shared UI package safe to share:
// no component may carry a specific site's identity.
//
// WHY THIS FILE EXISTS. The extraction into @ubx/docs-ui was audited
// component by component, by reading each one. That caught GlobalSearch,
// which had silently carried the user site's input styling onto the
// provider site, and it missed two others:
//
//   Footer               hardcoded the provider site's tagline
//                        ("Reference content is generated from each
//                        provider's own real schema, not hand-written")
//                        and a License link to ubx-docs-providers. On the
//                        user docs site, whose 137 pages are all
//                        hand-written MDX, the tagline asserted the exact
//                        opposite of the truth, on every page.
//
//   MobileSidebarToggle  hardcoded "Services" and "service navigation",
//                        AWS provider vocabulary, in the drawer heading
//                        and both aria-labels.
//
// GlobalSearch was caught because its regression was visually obvious. The
// other two were not, because wrong prose renders exactly like right
// prose. Reading is the wrong instrument. So this is mechanical, and it
// runs in CI on every PR.
//
// TWO RULES, and the second one's scanner is deliberately broader than
// the bug that prompted it. An early hand-run of this scan looked only at
// JSX text nodes and attributes, and reported the package clean apart
// from Footer. It was wrong: ThemeToggle keeps "System"/"Light"/"Dark" in
// an options array, never as JSX text, so a text-node-only scanner cannot
// see them. Those three are fine, but a site-specific string hidden the
// same way would have been equally invisible. The scanner therefore also
// reads `label:`-style object properties.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const files = readdirSync(src).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

// Source with comments removed, so prose in a comment never registers.
//
// The negative lookbehind is load-bearing, not tidiness. A line-comment
// pattern written without it also matches the double slash inside
// "https://", so it deletes every URL in the file before rule 1 can see
// one. That was the first version of this helper, and it made rule 1
// pass while the real Footer URL was sitting in the source: the rule was
// vacuous against precisely the bug it was written for. Found by
// reintroducing the bug and noticing the test still went green, which is
// why the reintroduction step is part of the workflow rather than an
// optional flourish.
//
// Deliberately line comments, not a block comment. The first draft of
// this note was a block comment quoting the naive pattern literally, and
// the quoted pattern ends in star-slash, which closed the comment early
// and made the whole file a syntax error.
function code(file) {
  return readFileSync(join(src, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(?<!:)\/\/[^\n]*/g, "");
}

// RULE 1: no literal http(s) URL anywhere in the package.
//
// Every URL names somebody's site. There is no such thing as a URL that
// is correct for all consumers, so a URL in shared code is always a
// latent version of the Footer bug. They arrive as props instead. This
// is the rule that would have caught Footer on the day it was written.
test("no component hardcodes a URL", () => {
  const offenders = [];
  for (const f of files) {
    for (const m of code(f).matchAll(/https?:\/\/[^\s"'`)]+/g)) {
      offenders.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "URLs belong to one site, so they must be props, not literals:\n" + offenders.join("\n"),
  );
});

// RULE 2: every user-visible string is on this list, with a reason.
//
// The list is short on purpose. Adding to it should feel like a decision,
// because the question it forces ("is this true on every site that will
// ever consume this package?") is exactly the question nobody asked about
// the word "Services".
const ALLOWED = new Map([
  ["ubx", "The product name. Identical on every ubx docs site."],
  ["Theme", "Names the light/dark control itself, not any site's content."],
  ["System", "A theme choice. Site-neutral."],
  ["Light", "A theme choice. Site-neutral."],
  ["Dark", "A theme choice. Site-neutral."],
  [
    "Navigation",
    "PageShell's default drawer heading. Names the thing itself rather " +
      "than either site's subject matter, which is what made \"Services\" wrong. " +
      "Both sites pass an explicit label anyway; this is the fallback.",
  ],
]);

test("every user-visible string is site-neutral", () => {
  const found = [];
  for (const f of files) {
    const s = code(f);
    // Text sitting directly between JSX tags. No length floor: "Services"
    // is 8 characters and a floor of 6 would still have caught it, but a
    // floor is an arbitrary hole and short labels are common.
    for (const m of s.matchAll(/>\s*([A-Za-z][^<>{}\n]*?)\s*</g)) {
      found.push([f, "jsx-text", m[1].trim()]);
    }
    // Attributes a screen reader or a tooltip surfaces to a person.
    for (const m of s.matchAll(/(aria-label|aria-description|title|placeholder|alt)="([^"]+)"/g)) {
      found.push([f, m[1], m[2]]);
    }
    // Object properties that end up rendered. This is the shape that
    // hides strings from a JSX-only scan, as ThemeToggle's own options
    // array demonstrates.
    for (const m of s.matchAll(/\b(label|title|heading|text|caption)\s*:\s*"([^"]+)"/g)) {
      found.push([f, `${m[1]}:`, m[2]]);
    }
    // Default parameter values. A third shape, and the one that matters
    // most, because a default is precisely a string a consuming site
    // gets without asking for it. Found by inspection when PageShell
    // introduced `sidebarLabel = "Navigation"` and all three scanners
    // above reported the package clean.
    for (const m of s.matchAll(
      /\b(\w*(?:[Ll]abel|[Tt]itle|[Hh]eading|[Cc]aption|[Pp]laceholder|[Tt]ext))\s*=\s*"([^"]+)"/g,
    )) {
      found.push([f, `${m[1]}=`, m[2]]);
    }
  }

  const offenders = found
    .filter(([, , text]) => text && !ALLOWED.has(text))
    .map(([f, kind, text]) => `${f} [${kind}] ${JSON.stringify(text)}`);

  assert.deepEqual(
    offenders,
    [],
    "User-visible strings must be site-neutral or arrive as props.\n" +
      "If one of these really is true on every consuming site, add it to\n" +
      "ALLOWED with the reason. Otherwise make it a prop:\n" +
      offenders.join("\n"),
  );
});

// A guard on the guard. If the scanners above silently stop matching
// anything (a regex edited wrong, a rename, a refactor into a shape they
// do not read), both tests above pass vacuously and the package loses its
// protection without anyone noticing.
//
// The first version of this file guarded only rule 2, and rule 1 was
// vacuous at that very moment because of the comment-stripping bug
// described on `code` above. So rule 1 is guarded here by a positive
// control: comment-strip a synthetic file that definitely contains a URL,
// and assert the URL survives to be seen.
test("rule 1 can still see a URL after comment stripping", () => {
  const sample = [
    "// a real line comment mentioning a License link, which must be stripped",
    'const x = <a href="https://github.com/Ubiquex/ubx-docs-providers/blob/main/LICENSE">L</a>;',
  ].join("\n");
  const stripped = sample.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
  assert.ok(!stripped.includes("must be stripped"), "line comments must still be removed");
  assert.match(
    stripped,
    /https:\/\/github\.com\/Ubiquex\/ubx-docs-providers/,
    "comment stripping ate the URL, so rule 1 is passing vacuously",
  );
});

test("the scanners still actually see strings", () => {
  const seen = [];
  for (const f of files) {
    const s = code(f);
    for (const m of s.matchAll(/>\s*([A-Za-z][^<>{}\n]*?)\s*</g)) seen.push(m[1].trim());
    for (const m of s.matchAll(/(aria-label|title|placeholder|alt)="([^"]+)"/g)) seen.push(m[2]);
    for (const m of s.matchAll(/\b(label|title|heading|text|caption)\s*:\s*"([^"]+)"/g)) seen.push(m[2]);
  }
  for (const known of ["ubx", "Theme", "System"]) {
    assert.ok(
      seen.includes(known),
      `scanner no longer finds ${known}, so the checks above are passing vacuously`,
    );
  }
});
