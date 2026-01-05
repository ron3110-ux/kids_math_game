
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  SUMMARY = 'SUMMARY',
  ANALYTICS = 'ANALYTICS'
}

export enum GameMode {
  TIMED = 'TIMED',
  RELAXED = 'RELAXED'
}

export enum DifficultyLevel {
  BASIC = 'BASIC',
  ADVANCED = 'ADVANCED'
}

export interface Question {
  num1: number | string;
  num2: number | string;
  operation: 'x' | '÷';
  answer: number;
  result: number | string; // The full equation result display
  options: number[];
  startTime?: number;
  missingPart: 'num1' | 'num2' | 'result';
}

export interface QuestionResult extends Question {
  selectedAnswer: number;
  isCorrect: boolean;
  timeTaken: number;
  usedHelp: boolean;
}

export interface GameStats {
  score: number;
  streak: number;
  totalAnswered: number;
  correctAnswers: number;
  results: QuestionResult[];
}

export interface SessionRecord {
  date: string;
  mode: GameMode;
  level: DifficultyLevel;
  score: number;
  accuracy: number;
  avgTime: number;
  totalHelpUsed: number;
  mistakes: string[];
  toughestQuestions: string[];
}
