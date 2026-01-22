export interface DraftItem {
  id: string;
  text: string;
  answer: string;
}

export class DraftStore {
  private drafts: DraftItem[] = [];
  private listeners: Array<() => void> = [];

  public add(draft: DraftItem) {
    this.drafts.push(draft);
    this.notify();
  }

  public remove(index: number) {
    if (index >= 0 && index < this.drafts.length) {
      this.drafts.splice(index, 1);
      this.notify();
    }
  }

  public getAll(): DraftItem[] {
    return [...this.drafts];
  }

  public getCount(): number {
    return this.drafts.length;
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}
