import type { App, TFile } from "obsidian";
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

// --- Adapter: reads app.metadataCache. Not unit-tested (Obsidian runtime). ---

export function getAllTags(app: App): TagEntry[] {
  // metadataCache.getTags() returns { "#tag": count } including nested paths.
  const raw = (app.metadataCache as unknown as {
    getTags(): Record<string, number>;
  }).getTags();
  return Object.entries(raw).map(([tag, count]) => ({ tag, count }));
}

/** Read inline + frontmatter tags for a single file, all normalized to '#…'. */
export function tagsForFile(app: App, file: TFile): string[] {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return [];
  const result: string[] = [];
  if (cache.tags) {
    for (const t of cache.tags) result.push(t.tag);
  }
  const fmTags: unknown = cache.frontmatter?.tags;
  if (Array.isArray(fmTags)) {
    for (const raw of fmTags) {
      if (typeof raw !== "string") continue;
      result.push(raw.startsWith("#") ? raw : "#" + raw);
    }
  } else if (typeof fmTags === "string") {
    // YAML scalar form: "foo bar" or "foo, bar"
    for (const raw of fmTags.split(/[,\s]+/).filter(Boolean)) {
      result.push(raw.startsWith("#") ? raw : "#" + raw);
    }
  }
  return result;
}

/** Return all markdown files tagged with `tag` or any descendant tag. */
export function notesForTag(app: App, tag: string): TFile[] {
  const prefix = tag + "/";
  const out: TFile[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const tags = tagsForFile(app, file);
    if (tags.some(t => t === tag || t.startsWith(prefix))) {
      out.push(file);
    }
  }
  return out;
}
