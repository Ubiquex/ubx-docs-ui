// Interaction tests for CodeTabs, against the compiled dist.
//
// The bug this component exists to prevent could not be caught by
// reading source: a client tab strip that renders an async server
// component works on first paint and throws on the first tab press. It
// shipped on 26,490 provider pages, on every viewport, and read as a
// failed page load because Next's error boundary replaced the route.
//
// So the tests that matter here are "does pressing a tab actually
// switch" and "does the default tab come from the caller's choice
// rather than array order". The first is the regression; the second is
// what stopped the provider site opening on whichever key its JSON
// happened to serialise first.
//
// Shares the jsdom setup rationale documented in mobile-nav.test.mjs.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { register } from "node:module";
import { JSDOM } from "jsdom";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
assert.ok(existsSync(join(dist, "CodeTabs.js")), "dist/CodeTabs.js missing; npm test builds via pretest");

register("./resolve-next-link.mjs", import.meta.url);

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/" });
for (const k of ["window", "document", "navigator", "Element", "HTMLElement", "Node", "Event", "MouseEvent", "KeyboardEvent", "getComputedStyle"]) {
  Object.defineProperty(globalThis, k, { value: dom.window[k], writable: true, configurable: true });
}
dom.window.requestAnimationFrame = (cb) => dom.window.setTimeout(() => cb(Date.now()), 0);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
after(() => dom.window.close());

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { CodeTabs } = await import(join(dist, "CodeTabs.js"));
const h = React.createElement;

// Panels as already-rendered nodes, which is the contract. If this
// component ever goes back to taking data and calling CodeBlock itself,
// these tests keep passing and the site breaks, so the guard against
// that is the type and the doc comment, not this file. What this file
// guards is that switching works at all.
const TABS = [
  { label: "Go", panel: h("pre", { "data-testid": "p-go" }, "package main") },
  { label: "TypeScript", panel: h("pre", { "data-testid": "p-ts" }, "import * as ubx") },
  { label: "Python", panel: h("pre", { "data-testid": "p-py" }, "import ubx_sdk") },
];

async function mount(t, props) {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(h(CodeTabs, { tabs: TABS, ...props }));
  });
  t.after(async () => {
    try {
      await act(async () => root.unmount());
    } catch {
      // Already reported by whichever assertion failed.
    }
    container.remove();
  });
  const doc = dom.window.document;
  const visible = () =>
    ["go", "ts", "py"].filter((k) => {
      const el = doc.querySelector(`[data-testid="p-${k}"]`);
      if (!el) return false;
      // `hidden` is set on the wrapper, and jsdom does not apply the UA
      // stylesheet, so read the attribute rather than computed display.
      return !el.closest("[hidden]");
    });
  return {
    doc,
    visible,
    press: async (label) => {
      const btn = [...doc.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
      assert.ok(btn, `no tab labelled ${label}`);
      await act(async () => {
        btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      });
    },
    selected: () =>
      [...doc.querySelectorAll("button")]
        .filter((b) => b.getAttribute("aria-selected") === "true")
        .map((b) => b.textContent.trim()),
  };
}

test("pressing a tab switches the panel", async (t) => {
  // The regression. This is what threw on the provider site.
  const c = await mount(t, { defaultLabel: "TypeScript" });
  assert.deepEqual(c.visible(), ["ts"], "should open on the default tab");
  await c.press("Go");
  assert.deepEqual(c.visible(), ["go"], "pressing Go should show the Go panel");
  await c.press("Python");
  assert.deepEqual(c.visible(), ["py"], "pressing Python should show the Python panel");
});

test("the default tab is the caller's choice, not array order", async (t) => {
  // TypeScript is third in TABS. If this ever reads index 0 again, the
  // site silently opens on Go.
  const c = await mount(t, { defaultLabel: "TypeScript" });
  assert.deepEqual(c.selected(), ["TypeScript"]);
  assert.deepEqual(c.visible(), ["ts"]);
});

test("an unknown or absent default falls back to the first tab", async (t) => {
  // Never render zero panels because a label was misspelled.
  const c1 = await mount(t, { defaultLabel: "Rust" });
  assert.deepEqual(c1.visible(), ["go"], "unknown label should fall back, not blank");
  const c2 = await mount(t, {});
  assert.deepEqual(c2.visible(), ["go"], "no default should fall back, not blank");
});

test("exactly one panel is visible at a time", async (t) => {
  const c = await mount(t, { defaultLabel: "TypeScript" });
  for (const label of ["Go", "Python", "TypeScript", "Go"]) {
    await c.press(label);
    assert.equal(c.visible().length, 1, `after pressing ${label}, exactly one panel should show`);
    assert.equal(c.selected().length, 1, `after pressing ${label}, exactly one tab should be selected`);
  }
});

test("reserveHeight keeps every panel mounted for sizing", async (t) => {
  // The provider site needs the box sized to the tallest panel so the
  // page does not shift when switching. That means all panels present,
  // with the active one over them.
  const c = await mount(t, { defaultLabel: "Go", reserveHeight: true });
  assert.equal(c.doc.querySelectorAll('[data-testid="p-go"]').length, 2,
    "the active panel should appear twice: once in the sizing stack, once on top");
  assert.ok(c.doc.querySelector('[aria-hidden="true"]'), "the sizing stack should be hidden from assistive tech");
  await c.press("Python");
  assert.equal(c.selected()[0], "Python", "switching still works with the reservoir on");
});

test("the harness actually renders the component", async (t) => {
  const c = await mount(t, { defaultLabel: "Go" });
  assert.equal(c.doc.querySelectorAll("button").length, TABS.length, "no tabs rendered, so the tests above prove nothing");
  assert.ok(c.doc.querySelector('[role="tablist"]'), "no tablist rendered");
});
