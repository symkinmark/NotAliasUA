import englishWords from "./top-2000-english-words.json";
import russianWords from "./top-2000-russian-words.json";
import ukrainianWords from "./uk-words.json";
import type { Language } from "../i18n/translations";

const wordLists: Record<Language, string[]> = {
  uk: ukrainianWords,
  en: englishWords,
  ru: russianWords,
};

// Shuffled bag: every word appears exactly once before any repeats.
const bags: Partial<Record<Language, string[]>> = {};

function fillBag(language: Language): string[] {
  const bag = [...wordLists[language]];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  bags[language] = bag;
  return bag;
}

export function resetUsedWords() {
  for (const key of Object.keys(bags)) {
    delete bags[key as Language];
  }
}

export function getRandomWord(language: Language): string {
  let bag = bags[language];
  if (!bag || bag.length === 0) {
    bag = fillBag(language);
  }
  return bag.pop()!;
}
