import type { ThemeRegistration } from "shiki";

// Theme A as a real TextMate theme for Shiki.
//
// Every color is a CSS variable rather than a hex value, deliberately.
// Both consuming sites already define --color-code-green/red/yellow,
// --color-foreground, --color-foreground-muted and --color-code-bg in
// their own globals.css, and already swap them under [data-theme] and
// prefers-color-scheme. Emitting variables means light and dark keep
// working through the existing mechanism with zero client JS, and this
// package never has to know what the actual colors are.
//
// Theme A is deliberately coarse: green for keywords, types, numbers and
// language constants; red for string literals; yellow for property
// names; muted for comments; foreground for everything else. Mapping a
// coarse palette onto TextMate's fine-grained scopes is many-to-one,
// which is the easy direction.
//
// THE THREE OVERRIDES AT THE BOTTOM ARE THE POINT OF THIS FILE. They
// were findable only by inspecting real Shiki token output per language,
// not by reading scope documentation, and without them the naive mapping
// is visibly WORSE than the hand-rolled tokenizer it replaces. They are
// written out with their reasoning because the next person to touch this
// will not otherwise know why a plausible-looking simplification breaks
// the dominant language on the user docs site.
export const themeA: ThemeRegistration = {
  name: "ubx-theme-a",
  // Irrelevant in practice: every color below is a variable, and the
  // consuming site's own [data-theme] contract decides light or dark.
  type: "dark",
  colors: {
    "editor.foreground": "var(--color-foreground)",
    // Transparent, deliberately. Shiki puts this on the <pre> as an
    // INLINE style, and an inline style beats any class the wrapper can
    // apply. CodeBlock's own `[&_pre]:bg-transparent` was written to
    // neutralise it and never could: it emits
    // `.bg-transparent pre{background-color:#0000}`, a class selector,
    // which loses to `style="background-color:..."` every time.
    //
    // So the code block's surface is the wrapper's job, one source of
    // truth, and this theme only ever sets foreground colours.
    "editor.background": "transparent",
  },
  tokenColors: [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "var(--color-foreground-muted)" },
    },

    // GREEN: keywords, types, numeric and language constants.
    {
      scope: [
        "keyword",
        "storage",
        "storage.type",
        "storage.modifier",
        "constant.language",
        "constant.numeric",
        "support.type",
        "entity.name.type",
        "entity.name.class",
        "support.class",

        // The shell command itself, a deliberate docs-specific choice
        // rather than a general one. In these docs the subject of nearly
        // every fence is a ubx command, and the hand-rolled tokenizer
        // this replaces had "ubx" in a hardcoded keyword set for exactly
        // that reason. Shiki scopes it precisely as entity.name.command,
        // so the intent survives the swap without hardcoding a binary
        // name into a shared library.
        "entity.name.function.call",
        "entity.name.command",
      ],
      settings: { foreground: "var(--color-code-green)" },
    },

    // RED: real string literals only. See override 1 below for what this
    // must NOT catch.
    {
      scope: ["string", "string.quoted", "punctuation.definition.string"],
      settings: { foreground: "var(--color-code-red)" },
    },

    // YELLOW: property and attribute names.
    {
      scope: [
        "variable.other.member",
        "meta.object-literal.key",
        "support.type.property-name",
        "meta.mapping.key",

        // HCL attribute names. The hand-rolled tokenizer only recognised
        // the `name:` form and so left HCL's `name =` plain. Shiki scopes
        // it, so this is strictly closer to theme A's stated intent than
        // what it replaces.
        "variable.other.readwrite.hcl",
        "variable.declaration.hcl",

        // Go struct-literal field names. Verified against real token
        // output: Go scopes `Owner:` inside a composite literal as
        // variable.other.property, which is NOT covered by the generic
        // object-literal scopes above. Without this, Go examples lose the
        // yellow the hand-rolled tokenizer gave them, which showed up
        // when the provider site's rendered code was diffed before and
        // after the swap.
        "variable.other.property",

        // YAML and TOML mapping keys. UBI-247 slice 3: verified against
        // real token output before being written, and the naive
        // assumption was wrong in two ways. YAML keys carry BOTH
        // entity.name.tag.yaml and string.unquoted.plain.out.yaml, so
        // override 1 below (which exists for shell) was silently
        // stripping every key in every CI example to plain. TOML keys
        // are variable.other.key.toml, covered by nothing above.
        "entity.name.tag",
        "variable.other.key.toml",
      ],
      settings: { foreground: "var(--color-code-yellow)" },
    },

    // ---- Overrides. More specific scopes win, so these run last. ----

    // OVERRIDE 1, the important one. Shell grammars scope every bare
    // command argument as string.unquoted, so the naive mapping paints an
    // ENTIRE command line red. Measured on the user docs site: 92 of 116
    // code fences are bash, so this would have been the single most
    // visible thing on the site, and it is also a lie about what red
    // means in theme A (a string literal). Confirmed against real token
    // output: `ubx scan --propose both` came out as
    // ubx=plain scan=RED --propose=RED both=RED before this override, and
    // ubx=GREEN with the rest plain after it.
    {
      scope: ["string.unquoted", "constant.other.option"],
      settings: { foreground: "var(--color-foreground)" },
    },

    // OVERRIDE 2. An assignment operator is not a keyword in theme A's
    // sense. Without this, HCL's `=` renders green and reads as though it
    // were a language keyword, which is exactly the emphasis theme A
    // reserves for real keywords and types.
    {
      scope: ["keyword.operator"],
      settings: { foreground: "var(--color-foreground)" },
    },

    // OVERRIDE 5. The YAML grammar scopes a bare `on` as a boolean
    // constant, not as a key, because YAML 1.1 really does treat `on` as
    // true. In GitHub Actions `on:` is the trigger key and appears in
    // essentially every CI example (25 of 29 YAML fences in these docs
    // are Actions workflows), so leaving it green made one key in every
    // file render as though it were a language keyword while its
    // siblings were yellow.
    //
    // The grammar cannot distinguish the two, so this is a real
    // trade-off rather than a clean fix: a genuine YAML boolean value
    // now renders plain instead of green. Chosen deliberately, because
    // in this corpus `on:` as a key is common and `true`/`false` as a
    // scalar value is rare, and a wrongly-emphasised key is more
    // misleading than an unemphasised boolean.
    {
      scope: ["constant.language.boolean.yaml"],
      settings: { foreground: "var(--color-foreground)" },
    },

    // OVERRIDE 4. TypeScript scopes the arrow of an arrow function as
    // storage.type.function.arrow, which the generic `storage.type` rule
    // above catches and paints green. The hand-rolled tokenizer left it
    // plain, and theme A reserves green for keywords and type names, not
    // punctuation. Also caught by the before/after diff rather than by
    // reading scopes.
    {
      scope: ["storage.type.function.arrow"],
      settings: { foreground: "var(--color-foreground)" },
    },
  ],
};

// OVERRIDE 3 is an omission rather than a rule, recorded here because it
// was a real mistake made and corrected during the mapping work: adding
// a blanket `punctuation` -> foreground override alongside the two above
// looks tidy and is wrong. It strips the color from the quote marks
// around JSON keys and string values, so `"provider"` renders with a
// yellow key between two plain quotes. Leave punctuation inheriting from
// its parent scope.

/** Languages theme A has been verified against, token by token. */
export const SUPPORTED_LANGS = [
  "go",
  "typescript",
  "python",
  "bash",
  "hcl",
  "json",
  // Added UBI-247 slice 3, each verified token by token: yaml (29
  // fences, concentrated in the Integrations section where CI config is
  // the entire subject), toml, and dockerfile.
  "yaml",
  "toml",
  "docker",
] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export function isSupportedLang(lang: string): lang is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}
