import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, PersistedData, PluginSettings } from "./types";
import { normalizeSettings, TagFinderSettingTab } from "./settings";
import { RecentTags, RecentTagsStore } from "./recentTags";
import { TagSuggestModal } from "./tagSuggestModal";
import { NoteSuggestModal } from "./noteSuggestModal";
import { installQuickSwitcherHook } from "./quickSwitcherHook";

export default class TagFinderPlugin extends Plugin {
  settings: PluginSettings = { ...DEFAULT_SETTINGS };
  recent!: RecentTags;
  private uninstallHook: (() => void) | null = null;

  async onload() {
    const persisted = (await this.loadData()) as Partial<PersistedData> | null;
    this.settings = normalizeSettings(persisted?.settings);
    const persistedRecent = Array.isArray(persisted?.recentTags)
      ? persisted!.recentTags.filter((v: unknown): v is string => typeof v === "string")
      : [];

    const recentStore: RecentTagsStore = {
      load: async () => persistedRecent,
      save: async next => {
        await this.saveData({ settings: this.settings, recentTags: next });
      },
    };
    this.recent = new RecentTags(recentStore, this.settings.recentLimit);
    await this.recent.init();

    this.addCommand({
      id: "open",
      name: "Open",
      callback: () => this.openTagPicker(""),
    });

    this.addSettingTab(new TagFinderSettingTab(this.app, this));
    this.refreshQuickSwitcherHook();
  }

  async onunload() {
    this.uninstallHook?.();
    this.uninstallHook = null;
  }

  openTagPicker(initialQuery: string) {
    const onPick = (tag: string, queryAtPickTime: string) => {
      const noteModal = new NoteSuggestModal(
        this.app,
        tag,
        queryAtPickTime,
        (lastTagQuery: string) => this.openTagPicker(lastTagQuery),
      );
      noteModal.open();
    };
    const modal = new TagSuggestModal(this.app, this.settings, this.recent, onPick, initialQuery);
    modal.open();
  }

  refreshQuickSwitcherHook() {
    this.uninstallHook?.();
    this.uninstallHook = null;
    if (this.settings.enableQuickSwitcherHook) {
      this.uninstallHook = installQuickSwitcherHook(this.app, (q) => this.openTagPicker(q));
    }
  }

  async savePluginData() {
    await this.saveData({
      settings: this.settings,
      recentTags: this.recent.get(),
    });
  }
}
