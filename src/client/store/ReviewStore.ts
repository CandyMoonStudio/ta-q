import { ReviewData, ReviewItem } from '../types.js';

const LS_KEY = 'taq_review_v2';

export class ReviewStore {
  private data: ReviewData = {};
  private listeners: Array<() => void> = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load review data', e);
      this.data = {};
    }
  }

  private save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.data));
      this.notify();
    } catch (e) {
      console.error('Save failed', e);
    }
  }

  public get(id: string | number): ReviewItem | undefined {
    return this.data[String(id)];
  }

  public getAll(): ReviewData {
    return this.data;
  }

  public setStatus(id: string | number, status: ReviewItem['status']) {
    const key = String(id);
    if (!this.data[key]) {
      this.data[key] = { id, status: null, note: '', updatedAt: 0 };
    }

    const current = this.data[key].status;
    if (current === status) {
      this.data[key].status = null; // Toggle off if same
    } else {
      this.data[key].status = status;
    }
    this.data[key].updatedAt = Date.now();
    this.save();
  }

  public setNote(id: string | number, note: string) {
    const key = String(id);
    const trimmed = note.trim();
    if (!this.data[key]) {
      this.data[key] = { id, status: null, note: '', updatedAt: 0 };
    }

    if (this.data[key].note !== trimmed) {
      this.data[key].note = trimmed;
      this.data[key].updatedAt = Date.now();
      this.save();
    }
  }

  public setDifficulty(id: string | number, rating: number) {
    const key = String(id);
    if (!this.data[key]) this.data[key] = { id: key, status: null, note: '', updatedAt: 0 };

    this.data[key].difficulty = rating;
    this.data[key].updatedAt = Date.now();
    this.save();
  }

  public update(id: string | number, updates: Partial<ReviewItem>) {
    const key = String(id);
    if (!this.data[key]) this.data[key] = { id: key, status: null, note: '', updatedAt: 0 };

    Object.assign(this.data[key], updates);
    this.data[key].updatedAt = Date.now();
    this.save();
  }

  public reset() {
    this.data = {};
    this.save();
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
