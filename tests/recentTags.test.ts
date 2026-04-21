import { describe, expect, it, vi } from "vitest";
import { RecentTags } from "../src/recentTags";

function makeStore(initial: string[] = []) {
  let state = [...initial];
  return {
    load: vi.fn(async () => state),
    save: vi.fn(async (next: string[]) => { state = [...next]; }),
    peek: () => state,
  };
}

describe("RecentTags", () => {
  it("returns [] when no prior state exists", async () => {
    const store = makeStore([]);
    const r = new RecentTags(store, 10);
    await r.init();
    expect(r.get()).toEqual([]);
  });

  it("loads persisted order", async () => {
    const store = makeStore(["#b", "#a", "#c"]);
    const r = new RecentTags(store, 10);
    await r.init();
    expect(r.get()).toEqual(["#b", "#a", "#c"]);
  });

  it("push moves an existing tag to the front", async () => {
    const store = makeStore(["#a", "#b", "#c"]);
    const r = new RecentTags(store, 10);
    await r.init();
    await r.push("#b");
    expect(r.get()).toEqual(["#b", "#a", "#c"]);
  });

  it("push adds a new tag at the front", async () => {
    const store = makeStore(["#a", "#b"]);
    const r = new RecentTags(store, 10);
    await r.init();
    await r.push("#c");
    expect(r.get()).toEqual(["#c", "#a", "#b"]);
  });

  it("push enforces limit by dropping the oldest", async () => {
    const store = makeStore(["#a", "#b", "#c"]);
    const r = new RecentTags(store, 3);
    await r.init();
    await r.push("#d");
    expect(r.get()).toEqual(["#d", "#a", "#b"]);
  });

  it("limit of 0 means get() always returns []", async () => {
    const store = makeStore(["#a", "#b"]);
    const r = new RecentTags(store, 0);
    await r.init();
    await r.push("#c");
    expect(r.get()).toEqual([]);
  });

  it("setLimit updates future gets and trims on next push", async () => {
    const store = makeStore(["#a", "#b", "#c", "#d"]);
    const r = new RecentTags(store, 10);
    await r.init();
    r.setLimit(2);
    expect(r.get()).toEqual(["#a", "#b"]);
    await r.push("#e");
    expect(r.get()).toEqual(["#e", "#a"]);
  });

  it("clear empties the list and persists", async () => {
    const store = makeStore(["#a"]);
    const r = new RecentTags(store, 10);
    await r.init();
    await r.clear();
    expect(r.get()).toEqual([]);
    expect(store.peek()).toEqual([]);
  });

  it("swallows save errors and keeps the in-memory list", async () => {
    const store = makeStore(["#a"]);
    store.save.mockRejectedValueOnce(new Error("disk full"));
    const r = new RecentTags(store, 10);
    await r.init();
    await r.push("#b"); // should not throw
    expect(r.get()).toEqual(["#b", "#a"]);
  });
});
