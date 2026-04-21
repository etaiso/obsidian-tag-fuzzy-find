import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import { DEFAULT_SETTINGS, EmptyStateMode, PluginSettings } from "./types";
import type TagFinderPlugin from "./main";

const VALID_MODES: EmptyStateMode[] = ["recent-then-usage", "usage", "alphabetical", "blank"];

function isValidMode(v: unknown): v is EmptyStateMode {
  return typeof v === "string" && (VALID_MODES as string[]).includes(v);
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

  return { emptyStateMode, enableQuickSwitcherHook, recentLimit };
}

// --- Settings tab UI (uses Obsidian runtime — not unit-tested) ---

export class TagFinderSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TagFinderPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl, plugin } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Initial sort")
      .setDesc("Order of tags before you start typing.")
      .addDropdown(dd =>
        dd
          .addOptions({
            "recent-then-usage": "Recent, then most-used",
            "usage": "Most-used",
            "alphabetical": "Alphabetical",
            "blank": "Empty until typing",
          })
          .setValue(plugin.settings.emptyStateMode)
          .onChange(async value => {
            plugin.settings.emptyStateMode = value as typeof plugin.settings.emptyStateMode;
            await plugin.savePluginData();
          }),
      );

    new Setting(containerEl)
      .setName("Integrate with Quick Switcher")
      .setDesc("Open Tag Finder when the Quick Switcher input starts with '#'.")
      .addToggle(t =>
        t.setValue(plugin.settings.enableQuickSwitcherHook).onChange(async value => {
          plugin.settings.enableQuickSwitcherHook = value;
          await plugin.savePluginData();
          plugin.refreshQuickSwitcherHook();
        }),
      );

    new Setting(containerEl)
      .setName("Recent tags to remember")
      .setDesc("0 disables recent entirely.")
      .addSlider(s =>
        s
          .setLimits(0, 30, 1)
          .setValue(plugin.settings.recentLimit)
          .setDynamicTooltip()
          .onChange(async value => {
            plugin.settings.recentLimit = value;
            plugin.recent.setLimit(value);
            await plugin.savePluginData();
          }),
      );

    new Setting(containerEl)
      .setName("Recent tags")
      .addButton(b =>
        b.setButtonText("Clear recent tags").onClick(async () => {
          await plugin.recent.clear();
          new Notice("Recent tags cleared.");
        }),
      );
  }
}
