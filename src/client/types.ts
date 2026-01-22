export interface ReviewItem {
  id: string | number;
  status: 'ok' | 'ng' | 'debug' | 'hold' | null;
  note: string;
  updatedAt: number;
  difficulty?: number;
  tags?: string[];
  type?: string;
}

export type ReviewData = Record<string, ReviewItem>;

export interface Question {
  id: string | number;
  question: string;
  answer: string;
  answer_display?: string;
  answer_variants?: string[]; // variants in JS logic
  romaji_typing?: string;
  type?: string;
  tags?: string[];
  difficulty?: number;

  // Internal / Build artifacts
  _list?: string;
  errors?: string[];
  source?: string;
  explanation?: string;
  reading?: string;

  // Runtime overrides
  note?: string;
}
