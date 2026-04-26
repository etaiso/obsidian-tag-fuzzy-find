import {
  DEFAULT_SETTINGS,
  EmptyStateMode,
  PluginSettings,
  TriggerPrefix,
  VALID_PREFIXES,
} from "./types";

const VALID_MODES: EmptyStateMode[] = ["recent-then-usage", "usage", "alphabetical", "blank"];

function isValidMode(v: unknown): v is EmptyStateMode {
  return typeof v === "string" && (VALID_MODES as string[]).includes(v);
}

function isValidPrefix(v: unknown): v is TriggerPrefix {
  return typeof v === "string" && (VALID_PREFIXES as string[]).includes(v);
}

export function normalizeSettings(raw: unknown): PluginSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const emptyStateMode = isValidMode(source.emptyStateMode)
    ? source.emptyStateMode
    : DEFAULT_SETTINGS.emptyStateMode;

  const enableQuickSwitcherHook = typeof source.enableQuickSwitcherHook === "boolean"
    ? source.enableQuickSwitcherHook
    : DEFAULT_SETTINGS.enableQuickSwitcherHook;

  let recentLimit = DEFAULT_SETTINGS.recentLimit;
  if (typeof source.recentLimit === "number" && Number.isFinite(source.recentLimit)) {
    recentLimit = Math.max(0, Math.min(30, Math.floor(source.recentLimit)));
  }

  const triggerPrefix = isValidPrefix(source.triggerPrefix)
    ? source.triggerPrefix
    : DEFAULT_SETTINGS.triggerPrefix;

  return { emptyStateMode, enableQuickSwitcherHook, recentLimit, triggerPrefix };
}
