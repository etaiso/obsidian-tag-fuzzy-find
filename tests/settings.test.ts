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
});
