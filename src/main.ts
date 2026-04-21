import { Plugin } from "obsidian";

export default class TagFinderPlugin extends Plugin {
  async onload() {
    console.log("[tag-finder] loaded (stub)");
  }
  async onunload() {
    console.log("[tag-finder] unloaded");
  }
}
