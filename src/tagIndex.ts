import { EmptyStateMode, TagEntry } from "./types";

/** Sort a list of TagEntry for the modal's empty-query state. Pure. */
export function sortTagsForEmptyState(
  entries: TagEntry[],
  recent: string[],
  mode: EmptyStateMode,
): TagEntry[] {
  if (mode === "blank") return [];

  if (mode === "alphabetical") {
    return [...entries].sort((a, b) =>
      a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" }),
    );
  }

  const byUsage = [...entries].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" });
  });

  if (mode === "usage") return byUsage;

  // recent-then-usage
  const entryByTag = new Map(entries.map(e => [e.tag, e]));
  const recentExisting: TagEntry[] = [];
  const seen = new Set<string>();
  for (const tag of recent) {
    const match = entryByTag.get(tag);
    if (match && !seen.has(tag)) {
      recentExisting.push(match);
      seen.add(tag);
    }
  }
  const remainder = byUsage.filter(e => !seen.has(e.tag));
  return [...recentExisting, ...remainder];
}

/**
 * Filter file paths to those whose tag set contains `tag` or any descendant
 * (Obsidian semantics: #parent includes #parent/child).
 *
 * `lookup(path)` returns the tags for a single file. Pure (does not touch
 * Obsidian runtime).
 */
export function filterFilesByTag(
  paths: string[],
  tag: string,
  lookup: (path: string) => string[],
): string[] {
  const prefix = tag + "/";
  const matched: string[] = [];
  for (const p of paths) {
    const tags = lookup(p);
    if (tags.some(t => t === tag || t.startsWith(prefix))) {
      matched.push(p);
    }
  }
  return matched;
}
