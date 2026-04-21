import { describe, expect, it } from "vitest";
import { filterFilesByTag, sortTagsForEmptyState } from "../src/tagIndex";
import { TagEntry } from "../src/types";

const mkEntry = (tag: string, count: number): TagEntry => ({ tag, count });

describe("sortTagsForEmptyState", () => {
  const entries: TagEntry[] = [
    mkEntry("#alpha", 3),
    mkEntry("#beta", 10),
    mkEntry("#gamma", 1),
  ];

  it("alphabetical: A→Z case-insensitive", () => {
    const out = sortTagsForEmptyState(entries, [], "alphabetical");
    expect(out.map(e => e.tag)).toEqual(["#alpha", "#beta", "#gamma"]);
  });

  it("usage: most-used first, tie-broken alphabetically", () => {
    const withTie = [...entries, mkEntry("#delta", 10)];
    const out = sortTagsForEmptyState(withTie, [], "usage");
    expect(out.map(e => e.tag)).toEqual(["#beta", "#delta", "#alpha", "#gamma"]);
  });

  it("blank: returns empty array", () => {
    expect(sortTagsForEmptyState(entries, [], "blank")).toEqual([]);
  });

  it("recent-then-usage: recents (in MRU order) first, then the rest by usage", () => {
    const out = sortTagsForEmptyState(entries, ["#gamma", "#alpha"], "recent-then-usage");
    expect(out.map(e => e.tag)).toEqual(["#gamma", "#alpha", "#beta"]);
  });

  it("recent-then-usage: recent tags that no longer exist are skipped", () => {
    const out = sortTagsForEmptyState(entries, ["#zzz", "#alpha"], "recent-then-usage");
    expect(out.map(e => e.tag)).toEqual(["#alpha", "#beta", "#gamma"]);
  });
});

describe("filterFilesByTag", () => {
  const mkFile = (path: string, tags: string[]) => ({ path, tags });
  const files = [
    mkFile("a.md", ["#project"]),
    mkFile("b.md", ["#project/work"]),
    mkFile("c.md", ["#project/work/urgent"]),
    mkFile("d.md", ["#personal"]),
    mkFile("e.md", ["#projection"]),   // must NOT match #project
  ];
  const lookup = (path: string) => files.find(f => f.path === path)!.tags;

  it("matches exact tag", () => {
    const out = filterFilesByTag(files.map(f => f.path), "#personal", lookup);
    expect(out).toEqual(["d.md"]);
  });

  it("includes descendant tags under a parent", () => {
    const out = filterFilesByTag(files.map(f => f.path), "#project", lookup);
    expect(out.sort()).toEqual(["a.md", "b.md", "c.md"]);
  });

  it("does not confuse string-prefix matches (#projection vs #project)", () => {
    const out = filterFilesByTag(["e.md"], "#project", lookup);
    expect(out).toEqual([]);
  });

  it("descendant rule requires a '/' separator", () => {
    const out = filterFilesByTag(files.map(f => f.path), "#project/work", lookup);
    expect(out.sort()).toEqual(["b.md", "c.md"]);
  });

  it("returns [] when no file matches", () => {
    const out = filterFilesByTag(files.map(f => f.path), "#missing", lookup);
    expect(out).toEqual([]);
  });
});
