"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// The generic entry shape, arrived at from two real call sites rather
// than one (UBI-247).
//
// The provider site's own version typed entries as
// { provider, providerName, wireType, dottedName, category, isDataSource, path }
// and filtered on dottedName/wireType. None of that exists on the user
// docs site, which indexes pages and sections. Extracting the provider
// shape would have forced the second consumer to fake fields it has no
// concept of.
//
// This is the smallest shape both can actually produce. The provider
// index maps onto it without loss: title = dottedName,
// subtitle = providerName, group = category, badge = "data" for a data
// source. That mapping is the evidence the shape is genuinely shared
// rather than merely plausible.
export type SearchEntry = {
  title: string;
  subtitle?: string;
  group?: string;
  /** Short tag rendered on the right, e.g. the provider site's "data". */
  badge?: string;
  path: string;
};

// PRESENTATION IS A PROP, NOT A DEFAULT, and that is deliberate.
//
// The first draft of this extraction silently carried the USER site's
// input styling into the provider site, changing its search box from a
// pill (rounded-full, px-5 py-3, text-base) to a bordered rectangle and
// its placeholder from "Search resources and data sources..." to
// "Search". Caught by diffing the provider site's rendered markup
// against the live site before and after the swap. A shared component
// quietly restyling a working site is exactly the failure mode this
// extraction was supposed to avoid, so both consumers now state their
// own presentation explicitly and neither inherits the other's.
export function GlobalSearch({
  indexUrl = "/search-index.json",
  placeholder,
  inputClassName,
  emptyMessage,
}: {
  indexUrl?: string;
  placeholder: string;
  inputClassName: string;
  /** Rendered when a non-empty query matches nothing. */
  emptyMessage?: (query: string) => React.ReactNode;
}) {
  const [index, setIndex] = useState<SearchEntry[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(indexUrl)
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setIndex([]));
  }, [indexUrl]);

  const q = query.trim().toLowerCase();
  const results = q
    ? index
        .filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.subtitle?.toLowerCase().includes(q) ||
            e.group?.toLowerCase().includes(q),
        )
        .slice(0, 20)
    : [];

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
      {q && (
        <div className="absolute z-10 mt-2 w-full rounded-2xl bg-surface shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-foreground-muted">
              {emptyMessage ? emptyMessage(query) : <>No matches for &ldquo;{query}&rdquo;.</>}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border">
              {results.map((r) => (
                <li key={r.path}>
                  <Link
                    href={r.path}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-surface"
                  >
                    <span>
                      <span className="text-primary">{r.title}</span>
                      {r.subtitle ? (
                        <span className="ml-2 text-xs text-foreground-muted">{r.subtitle}</span>
                      ) : null}
                    </span>
                    {r.badge ? (
                      <span className="shrink-0 rounded-full bg-foreground-muted/10 px-2 py-0.5 text-xs text-foreground-muted">
                        {r.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
