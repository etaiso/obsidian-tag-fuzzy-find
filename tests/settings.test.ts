import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/settings";
import { DEFAULT_SETTINGS } from "../src/types";

describe("normalizeSettings", () => {
  it("returns defaults when input is null or undefined", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps a valid emptyStateMode", () => {
    expect(normalizeSettings({ emptyStateMode: "usage" }).emptyStateMode).toBe("usage");
    expect(normalizeSettings({ emptyStateMode: "alphabetical" }).emptyStateMode).toBe("alphabetical");
    expect(normalizeSettings({ emptyStateMode: "blank" }).emptyStateMode).toBe("blank");
  });

  it("falls back when emptyStateMode is invalid", () => {
    expect(normalizeSettings({ emptyStateMode: "nonsense" }).emptyStateMode).toBe(DEFAULT_SETTINGS.emptyStateMode);
    expect(normalizeSettings({ emptyStateMode: 42 }).emptyStateMode).toBe(DEFAULT_SETTINGS.emptyStateMode);
  });

  it("coerces enableQuickSwitcherHook to boolean or default", () => {
    expect(normalizeSettings({ enableQuickSwitcherHook: false }).enableQuickSwitcherHook).toBe(false);
    expect(normalizeSettings({ enableQuickSwitcherHook: "yes" }).enableQuickSwitcherHook).toBe(DEFAULT_SETTINGS.enableQuickSwitcherHook);
  });

  it("clamps recentLimit to [0, 30]", () => {
    expect(normalizeSettings({ recentLimit: -5 }).recentLimit).toBe(0);
    expect(normalizeSettings({ recentLimit: 100 }).recentLimit).toBe(30);
    expect(normalizeSettings({ recentLimit: 5 }).recentLimit).toBe(5);
    expect(normalizeSettings({ recentLimit: 3.7 }).recentLimit).toBe(3);
    expect(normalizeSettings({ recentLimit: "ten" }).recentLimit).toBe(DEFAULT_SETTINGS.recentLimit);
  });

  it("treats NaN and Infinity as invalid recentLimit", () => {
    expect(normalizeSettings({ recentLimit: NaN }).recentLimit).toBe(DEFAULT_SETTINGS.recentLimit);
    expect(normalizeSettings({ recentLimit: Infinity }).recentLimit).toBe(DEFAULT_SETTINGS.recentLimit);
    expect(normalizeSettings({ recentLimit: -Infinity }).recentLimit).toBe(DEFAULT_SETTINGS.recentLimit);
  });

  it("ignores extra unknown keys on the input", () => {
    const result = normalizeSettings({ foo: "bar", recentLimit: 5, junk: { nested: true } });
    expect(result).toEqual({ ...DEFAULT_SETTINGS, recentLimit: 5 });
  });

  it("treats array input as empty object (all defaults)", () => {
    expect(normalizeSettings(["not", "an", "object"])).toEqual(DEFAULT_SETTINGS);
  });
});
