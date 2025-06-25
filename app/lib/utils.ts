import { Word } from './definitions';

export const formatDateToLocal = (dateStr: string, locale: string = 'en-US') => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const formatter = new Intl.DateTimeFormat(locale, options);
  return formatter.format(date);
};

export function shuffleArray(array: string[]) {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function longestCommonPrefix(s1: string, s2: string): string {
  let commonPrefix = '';
  const minLength = Math.min(s1.length, s2.length);

  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) {
      commonPrefix += s1[i];
    } else {
      break;
    }
  }

  return commonPrefix;
}

function isSpecialKey(key: string) {
  const c = key.charCodeAt(0);
  return !((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 32);
}

function extractSpecialKeys(input: string): string[] {
  return input.split('').filter(isSpecialKey);
}

export function getSpecialKeys(words: Word[]): string[] {
  const result = new Set<string>();
  words.forEach((word) => {
    extractSpecialKeys(word.word).forEach((c) => result.add(c));
    extractSpecialKeys(word.definition).forEach((c) => result.add(c));
  });
  return [...result];
}
