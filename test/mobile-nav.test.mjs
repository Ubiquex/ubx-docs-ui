// Interaction tests for MobileNav, against the compiled dist.
//
// Why this file exists. Every other test in this package reads source as
// text. That catches a hardcoded URL or a leaked site name, and it
// cannot catch anything about behaviour, which is where BOTH of this
// component's real bugs have been:
//
//   1. The destination nav was `hidden md:flex`, so below 768px it was
//      simply gone and there was no way to reach it on a phone. That is
//      what the drawer was added for.
//   2. The drawer then closed on ANY click inside the injected tree. The
//      provider site's service groups are <button> disclosure toggles,
//      so tapping one expanded the group and unmounted the drawer in the
//      same tick, and no resource page was reachable from a phone at all.
//
// Both shipped. Neither was catchable by reading the file, and the
// second was introduced by the fix for the first, which is the pattern
// worth guarding against rather than either bug on its own.
//
// Against dist/ rather than src/, so this exercises what consumers
// actually install, the same choice the "use client" check in ci.yml
// already makes. `pretest` builds first so `npm test` is self-contained.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { register } from "node:module";
import { JSDOM } from "jsdom";

// See resolve-next-link.mjs: dist imports "next/link", which Node cannot
// resolve on its own because Next declares no exports entry for it.
register("./resolve-next-link.mjs", import.meta.url);

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
assert.ok(
  existsSync(join(dist, "MobileNav.js")),
  "dist/MobileNav.js is missing. Run `npm run build` first; `npm test` does it via pretest.",
);

// The DOM has to exist before react-dom is imported: it reads globals at
// module scope, so importing it first pins it to a world with no
// document and every render then fails.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/",
});

// requestAnimationFrame is polyfilled rather than switched on through
// jsdom's pretendToBeVisual, which was the first thing tried. That option
// starts a permanent rAF loop, and a permanent loop keeps the event loop
// alive: when an assertion failed, the run did not report the failure and
// exit, it hung for 90 seconds and then printed a bare "test failed" with
// no indication of which assertion went. A suite that hangs on failure is
// close to useless, and this only surfaced because the guard was checked
// by deliberately breaking the component.
//
// open() only needs a double rAF to let the transition play. A macrotask
// is a faithful stand-in for that and leaves nothing running.
dom.window.requestAnimationFrame = (cb) => dom.window.setTimeout(() => cb(Date.now()), 0);
dom.window.cancelAnimationFrame = (id) => dom.window.clearTimeout(id);

// Stops jsdom's own timers so the process exits on its own once the tests
// are done, pass or fail.
after(() => dom.window.close());
// defineProperty rather than assignment: Node 24 ships its own
// `navigator` global as a getter-only property, so a plain assignment
// throws before a single test runs.
for (const k of ["window", "document", "navigator", "Element", "HTMLElement", "Node", "Event", "MouseEvent", "KeyboardEvent", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle"]) {
  Object.defineProperty(globalThis, k, {
    value: dom.window[k],
    writable: true,
    configurable: true,
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom implements no navigation, so letting an anchor click through
// prints "Not implemented: navigation" from deep inside jsdom on every
// run. Cancelled in the capture phase, which is what a router does in a
// real app anyway. preventDefault does not stop propagation, so the
// component's own handler still sees the click exactly as it would in a
// browser, which is the whole point of these tests.
dom.window.document.addEventListener(
  "click",
  (e) => {
    if (e.target?.closest?.("a")) e.preventDefault();
  },
  true,
);

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { MobileNav } = await import(join(dist, "MobileNav.js"));

const h = React.createElement;

// NEVER pass a DOM node to an assertion as actual or expected. Use
// assert.ok on a boolean instead.
//
// `assert.equal(drawer(), null)` reads better and costs 90 seconds when
// it fails: node builds a diff, which means serialising a jsdom element,
// and that walks a very large object graph. The suite looked like it was
// hanging on a component that would not settle. It was the failure
// MESSAGE being generated. The toggle test failed in 2 seconds the whole
// time, and the only difference between them was assert.ok against
// assert.equal.

// Every nav href is absolute on purpose. MobileNav renders next/link for
// an in-site path, and next/link wants an app-router context this
// harness has no reason to stand up. External hrefs render a plain <a>,
// which is the same element the close handler inspects, so nothing about
// what is under test is avoided by this.
const NAV = [
  { label: "Docs", href: "https://example.test/docs" },
  { label: "Providers", href: "https://example.test/providers" },
];

/**
 * Mounts MobileNav with an injected tree and returns DOM helpers.
 *
 * Takes the test context so teardown is registered with t.after rather
 * than called at the end of each test. That is not tidiness. An
 * assertion throws, so a cleanup call written after it never runs: the
 * root stayed mounted, the next test mounted a second one over it and
 * queried a stale drawer, and the run hung for 90 seconds and then
 * reported a bare "test failed" with no indication of which assertion
 * went. Found by deliberately reintroducing the bug this file guards
 * against, which is the only way that behaviour shows up.
 */
async function mount(t, sidebar) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      h(MobileNav, {
        nav: NAV,
        sidebar,
        sidebarLabel: "Pages",
        // Off so the test does not also stand up ThemeToggle's storage
        // subscription. The theme control is not what is under test.
        showThemeToggle: false,
      }),
    );
  });
  t.after(async () => {
    // Inside act, so React finishes its own teardown rather than warning
    // about updates outside it. Wrapped because a root that already threw
    // during render cannot always unmount cleanly, and teardown must not
    // turn one failure into two.
    try {
      await act(async () => {
        root.unmount();
      });
    } catch {
      // Already reported by the assertion that failed.
    }
    container.remove();
  });

  const doc = dom.window.document;
  return {
    doc,
    drawer: () => doc.querySelector('[role="dialog"]'),
    burger: () => doc.querySelector('button[aria-label="Open navigation"]'),
    click: async (el) => {
      assert.ok(el, "tried to click an element that is not in the DOM");
      await act(async () => {
        el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
      });
    },
    // close() flips `visible` at once and unmounts one transition later,
    // so "did it close" is only answerable after that has elapsed.
    settle: async () => {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });
    },
  };
}

/** A tree shaped like the provider sidebar: a toggle, and links under it. */
function providerLikeTree() {
  return h("div", null, [
    h("button", { key: "t", type: "button", "data-testid": "group-toggle" }, "Account Access"),
    h("a", { key: "l", href: "/aws/2.2.1/iam/role", "data-testid": "resource-link" }, [
      // Nested on purpose: a real link's clickable area is usually a
      // child, so the handler has to walk up rather than read the target.
      h("span", { key: "s" }, "iam.Role"),
    ]),
    h("a", { key: "n", href: "#", "data-testid": "non-destination" }, "Not a destination"),
  ]);
}

test("the burger opens the drawer", async (t) => {
  const d = await mount(t, providerLikeTree());
  assert.ok(!d.drawer(), "drawer should not be mounted before the burger is used");
  await d.click(d.burger());
  assert.ok(d.drawer(), "drawer should be open after tapping the burger");
});

// Regression: bug 2 above. This is the case that made the provider site
// unnavigable on a phone.
test("a toggle inside the drawer does NOT close it", async (t) => {
  const d = await mount(t, providerLikeTree());
  await d.click(d.burger());
  assert.ok(d.drawer(), "precondition: drawer open");

  const toggle = d.doc.querySelector('[data-testid="group-toggle"]');
  assert.ok(toggle, "the injected tree's toggle should be inside the drawer");
  await d.click(toggle);
  await d.settle();

  assert.ok(
    d.drawer(),
    "a <button> inside the injected tree must leave the drawer open: it is a " +
      "disclosure toggle, not a destination. This is the bug that made every " +
      "resource page unreachable on the provider site at phone width.",
  );
});

test("an anchor with no real destination does not close it either", async (t) => {
  const d = await mount(t, providerLikeTree());
  await d.click(d.burger());
  await d.click(d.doc.querySelector('[data-testid="non-destination"]'));
  await d.settle();
  assert.ok(d.drawer(), 'href="#" is not a destination, so the drawer should stay open');
});

// The behaviour the close handler exists for, which the fix above must
// not have traded away.
test("a link inside the drawer DOES close it", async (t) => {
  const d = await mount(t, providerLikeTree());
  await d.click(d.burger());
  assert.ok(d.drawer(), "precondition: drawer open");

  // Clicking the span inside the anchor, not the anchor, because that is
  // what a real tap hits.
  const inner = d.doc.querySelector('[data-testid="resource-link"] span');
  assert.ok(inner, "precondition: the link has a nested clickable child");
  await d.click(inner);
  await d.settle();

  assert.ok(
    !d.drawer(),
    "choosing a destination must close the drawer, including when the click " +
      "lands on a child of the anchor rather than the anchor itself",
  );
});

test("Escape closes the drawer", async (t) => {
  const d = await mount(t, providerLikeTree());
  await d.click(d.burger());
  assert.ok(d.drawer(), "precondition: drawer open");
  await act(async () => {
    d.doc.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await d.settle();
  assert.ok(!d.drawer(), "a drawer with no keyboard exit is a trap");
});

// A guard on the guard, matching the one the identity scan carries. If
// the harness silently stopped rendering, every assertion above that
// looks for absence would pass against an empty document and the file
// would protect nothing.
test("the harness actually renders the component", async (t) => {
  const d = await mount(t, providerLikeTree());
  assert.ok(d.burger(), "no burger rendered, so the tests above prove nothing");
  await d.click(d.burger());
  const drawer = d.drawer();
  assert.ok(drawer, "no drawer rendered");
  assert.ok(
    drawer.querySelector('[data-testid="group-toggle"]'),
    "the injected tree is not inside the drawer, so the tests above are not testing it",
  );
  assert.equal(
    drawer.querySelectorAll("a[href^='https://example.test']").length,
    NAV.length,
    "the destination nav is not rendering inside the drawer",
  );
});
