import { AttemptRecord, Exam, ExamsDataset, Question } from '../types';
import rawData from '../data/examsData.json';

export const examsDataset = rawData as unknown as ExamsDataset;

export const allQuestions: Question[] = examsDataset.exams.flatMap((e) => e.questions);

export const questionById: Record<string, Question> = Object.fromEntries(
  allQuestions.map((q) => [q.id, q])
);

const ATTEMPTS_KEY = 'istqb_ctfl_attempts_v1';
const BOOKMARKS_KEY = 'istqb_ctfl_bookmarks_v1';
const WRONG_IDS_KEY = 'istqb_ctfl_wrong_ids_v1';

// Official ISTQB CTFL 40-question distribution across 6 chapters
export const ISTQB_CHAPTER_WEIGHTS: Record<number, number> = {
  1: 8,
  2: 6,
  3: 4,
  4: 11,
  5: 9,
  6: 2,
};

export const CHAPTER_SHORT_NAMES: Record<number, string> = {
  1: 'Ch.1: Nền tảng kiểm thử',
  2: 'Ch.2: Kiểm thử trong SDLC',
  3: 'Ch.3: Kiểm thử tĩnh',
  4: 'Ch.4: Phân tích & Thiết kế',
  5: 'Ch.5: Quản lý kiểm thử',
  6: 'Ch.6: Công cụ kiểm thử',
};

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildExamQuestionSet(
  exam: Exam,
  setMode: 'original' | 'standard40',
  shuffle: boolean
): Question[] {
  let result: Question[] = [...exam.questions];

  if (setMode === 'standard40') {
    if (result.length > 40) {
      // Keep all regular questions first, then supplementary up to 40
      result = result.slice(0, 40);
    } else if (result.length < 40) {
      const needed = 40 - result.length;
      const existingIds = new Set(result.map((q) => q.id));
      const pool = shuffleArray(allQuestions.filter((q) => !existingIds.has(q.id)));
      result = [...result, ...pool.slice(0, needed)];
    }
  }

  return shuffle ? shuffleArray(result) : result;
}

export function generateOfficialMock40(): Question[] {
  const selected: Question[] = [];
  for (const [chStr, count] of Object.entries(ISTQB_CHAPTER_WEIGHTS)) {
    const ch = Number(chStr);
    const chPool = shuffleArray(allQuestions.filter((q) => q.chapter === ch));
    selected.push(...chPool.slice(0, count));
  }
  return shuffleArray(selected);
}

export function loadAttempts(): AttemptRecord[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: AttemptRecord): AttemptRecord[] {
  const current = loadAttempts();
  const next = [attempt, ...current].slice(0, 100);
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
  return next;
}

export function clearAttempts(): void {
  localStorage.removeItem(ATTEMPTS_KEY);
}

export function loadBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(ids: string[]): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(new Set(ids))));
}

export function loadWrongIds(): string[] {
  try {
    const raw = localStorage.getItem(WRONG_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function updateWrongIdsAfterQuiz(
  questions: Question[],
  userAnswers: Record<string, string>
): string[] {
  const currentSet = new Set(loadWrongIds());
  for (const q of questions) {
    const ans = userAnswers[q.id];
    if (ans && ans !== q.correctAnswer) {
      currentSet.add(q.id);
    } else if (ans && ans === q.correctAnswer) {
      // Remove from wrong list if answered right!
      currentSet.delete(q.id);
    }
  }
  const next = Array.from(currentSet);
  localStorage.setItem(WRONG_IDS_KEY, JSON.stringify(next));
  return next;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

