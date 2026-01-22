import { Question } from './types';

declare global {
  interface Window {
    SERVER_DATA: Question[];
  }
  const SERVER_DATA: Question[];
}
