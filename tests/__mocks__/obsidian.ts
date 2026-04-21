// Minimal runtime stub for the `obsidian` package in tests.
// The real package ships only type declarations, so any code path that
// imports runtime values from "obsidian" needs an alias during tests.
export class PluginSettingTab {
  app: unknown;
  plugin: unknown;
  containerEl: { empty(): void };
  constructor(app: unknown, plugin: unknown) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = { empty: () => {} };
  }
  display(): void {}
  hide(): void {}
}

export class Setting {
  constructor(_containerEl: unknown) {}
  setName(_v: string) { return this; }
  setDesc(_v: string) { return this; }
  addDropdown(_cb: (d: unknown) => unknown) { return this; }
  addToggle(_cb: (t: unknown) => unknown) { return this; }
  addSlider(_cb: (s: unknown) => unknown) { return this; }
  addButton(_cb: (b: unknown) => unknown) { return this; }
}

export class Notice {
  constructor(_message: string) {}
}

export class Plugin {
  app: unknown;
  constructor() { this.app = {}; }
  async loadData() { return null; }
  async saveData(_data: unknown) {}
  addCommand(_cmd: unknown) {}
  addSettingTab(_tab: unknown) {}
  async onload() {}
  async onunload() {}
}

export class SuggestModal<T> {
  app: unknown;
  constructor(app: unknown) { this.app = app; }
  setPlaceholder(_v: string) {}
  open() {}
  close() {}
}

export class App {}
export class TFile {}
