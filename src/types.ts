export type TagEntry = {
  /** Tag string including the leading '#', e.g. '#project/work'. */
  tag: string;
  /** Number of notes carrying this exact tag (not descendants). */
  count: number;
};

export type EmptyStateMode =
  | "recent-then-usage"
  | "usage"
  | "alphabetical"
  | "blank";

export type TriggerPrefix = "#" | ":" | "@" | "!" | ">" | "?";

export const VALID_PREFIXES: TriggerPrefix[] = ["#", ":", "@", "!", ">", "?"];

export type PluginSettings = {
  emptyStateMode: EmptyStateMode;
  enableQuickSwitcherHook: boolean;
  /** 0..30; 0 disables recent-tags entirely. */
  recentLimit: number;
  /** Single-character prefix that activates the Quick Switcher hook. */
  triggerPrefix: TriggerPrefix;
};

export const DEFAULT_SETTINGS: PluginSettings = {
  emptyStateMode: "recent-then-usage",
  enableQuickSwitcherHook: true,
  recentLimit: 10,
  triggerPrefix: "#",
};

/** Shape of the blob stored via plugin.saveData(). */
export type PersistedData = {
  settings: PluginSettings;
  recentTags: string[];
};
