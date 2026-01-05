
import { Question, DifficultyLevel } from '../types';

export const generateQuestion = (level: DifficultyLevel = DifficultyLevel.BASIC, maxNum: number = 10): Question => {
  const isMultiplication = Math.random() > 0.5;
  let n1: number, n2: number, ansValue: number, operation: 'x' | '÷';

  if (isMultiplication) {
    n1 = Math.floor(Math.random() * (maxNum - 1)) + 2;
    n2 = Math.floor(Math.random() * (maxNum - 1)) + 2;
    ansValue = n1 * n2;
    operation = 'x';
  } else {
    const factor1 = Math.floor(Math.random() * (maxNum - 1)) + 2;
    const factor2 = Math.floor(Math.random() * (maxNum - 1)) + 2;
    ansValue = factor2;
    n1 = factor1 * factor2;
    n2 = factor1;
    operation = '÷';
  }

  let missingPart: 'num1' | 'num2' | 'result' = 'result';
  let correctAnswer: number = 0;

  if (level === DifficultyLevel.ADVANCED) {
    const rand = Math.random();
    if (rand < 0.33) {
      missingPart = 'num1';
      correctAnswer = n1;
    } else if (rand < 0.66) {
      missingPart = 'num2';
      correctAnswer = n2;
    } else {
      missingPart = 'result';
      correctAnswer = isMultiplication ? ansValue : ansValue;
    }
  } else {
    missingPart = 'result';
    correctAnswer = isMultiplication ? ansValue : ansValue;
  }

  // Generate options based on the correctAnswer
  const options = new Set<number>();
  options.add(correctAnswer);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 5) + 1;
    const sign = Math.random() > 0.5 ? 1 : -1;
    const fake = Math.abs(correctAnswer + (offset * sign));
    if (fake !== correctAnswer && fake > 0) options.add(fake);
  }

  return {
    num1: missingPart === 'num1' ? '?' : n1,
    num2: missingPart === 'num2' ? '?' : n2,
    result: missingPart === 'result' ? '?' : (isMultiplication ? n1 * n2 : n1 / n2),
    operation,
    answer: correctAnswer,
    options: Array.from(options).sort((a, b) => a - b),
    missingPart
  };
};
