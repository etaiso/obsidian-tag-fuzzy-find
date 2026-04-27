import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type TagFuzzyFindPlugin from "./main";

export class TagFuzzyFindSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TagFuzzyFindPlugin) {
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
      .setName("Quick switcher trigger")
      .setDesc("First character to type in the Quick switcher to open Tag Fuzzy Find.")
      .addDropdown(dd =>
        dd
          .addOptions({
            "#": "# (Hash)",
            ":": ": (Colon)",
            "@": "@ (At sign)",
            "!": "! (Exclamation mark)",
            ">": "> (Greater than)",
            "?": "? (Question mark)",
          })
          .setValue(plugin.settings.triggerPrefix)
          .onChange(async value => {
            plugin.settings.triggerPrefix = value as typeof plugin.settings.triggerPrefix;
            await plugin.savePluginData();
            plugin.refreshQuickSwitcherHook();
          }),
      );

    new Setting(containerEl)
      .setName("Integrate with Quick switcher")
      .setDesc("Open Tag Fuzzy Find when the Quick switcher input starts with the trigger character above.")
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
