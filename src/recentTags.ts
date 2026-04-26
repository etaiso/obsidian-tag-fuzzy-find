export interface RecentTagsStore {
  load(): Promise<string[]>;
  save(next: string[]): Promise<void>;
}

export class RecentTags {
  private list: string[] = [];
  private saveQueue: Promise<void> = Promise.resolve();
  private limit: number;

  constructor(private readonly store: RecentTagsStore, initialLimit: number) {
    this.limit = Math.max(0, initialLimit);
  }

  async init(): Promise<void> {
    try {
      this.list = await this.store.load();
    } catch {
      this.list = [];
    }
  }

  setLimit(next: number): void {
    this.limit = Math.max(0, next);
  }

  get(): string[] {
    if (this.limit <= 0) return [];
    return this.list.slice(0, this.limit);
  }

  async push(tag: string): Promise<void> {
    const without = this.list.filter(t => t !== tag);
    const next = [tag, ...without].slice(0, this.limit);
    this.list = next;
    await this.persist();
  }

  async clear(): Promise<void> {
    this.list = [];
    await this.persist();
  }

  private persist(): Promise<void> {
    const snapshot = [...this.list];
    const next = this.saveQueue.then(async () => {
      try {
        await this.store.save(snapshot);
      } catch (err) {
        console.warn("[tag-fuzzy-find] failed to save recent tags", err);
      }
    });
    this.saveQueue = next;
    return next;
  }
}
