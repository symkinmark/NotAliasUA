import rawUkrainian from "./uk-words.json";
import englishWords from "./top-2000-english-words.json";
import russianWords from "./top-2000-russian-words.json";
import type { Language } from "../i18n/translations";
import { topicIds, type TopicId } from "./topics";

export type Difficulty = 1 | 2 | 3;

export type Word = {
  text: string;
  topic: TopicId;
  difficulty: Difficulty;
};

type RawWord = [string, TopicId, Difficulty];

/** Ukrainian is the tagged list; en/ru are plain and get neutral tags. */
const ukrainian: Word[] = (rawUkrainian as RawWord[]).map(([text, topic, difficulty]) => ({
  text,
  topic,
  difficulty,
}));

function untagged(words: string[]): Word[] {
  return words.map((text) => ({ text, topic: "abstract" as TopicId, difficulty: 2 as Difficulty }));
}

const byLanguage: Record<Language, Word[]> = {
  uk: ukrainian,
  en: untagged(englishWords),
  ru: untagged(russianWords),
};

/** Only Ukrainian carries topic and difficulty tags. */
export function isTagged(language: Language) {
  return language === "uk";
}

export function countsByTopic(): Record<TopicId, number> {
  const counts = Object.fromEntries(topicIds.map((id) => [id, 0])) as Record<TopicId, number>;
  for (const word of ukrainian) counts[word.topic] += 1;
  return counts;
}

export function countFor(topics: TopicId[]): number {
  if (topics.length === 0) return ukrainian.length;
  const wanted = new Set(topics);
  return ukrainian.filter((word) => wanted.has(word.topic)).length;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * A shuffled bag: every word in the selection comes up once before any repeat.
 * Refills itself when exhausted, and rebuilds whenever the selection changes.
 */
export class WordPool {
  private bag: Word[] = [];
  private signature = "";

  private sourceFor(language: Language, topics: TopicId[]): Word[] {
    const all = byLanguage[language];
    if (!isTagged(language) || topics.length === 0) return all;
    const wanted = new Set(topics);
    const picked = all.filter((word) => wanted.has(word.topic));
    return picked.length > 0 ? picked : all;
  }

  /** Rebuilds the bag only when the language or topic selection actually changed. */
  configure(language: Language, topics: TopicId[]) {
    const signature = `${language}|${[...topics].sort().join(",")}`;
    if (signature === this.signature && this.bag.length > 0) return;
    this.signature = signature;
    this.bag = shuffled(this.sourceFor(language, topics));
  }

  /** Explicit reshuffle — same selection, fresh order, nothing used yet. */
  reshuffle(language: Language, topics: TopicId[]) {
    this.signature = `${language}|${[...topics].sort().join(",")}`;
    this.bag = shuffled(this.sourceFor(language, topics));
  }

  draw(language: Language, topics: TopicId[]): Word {
    this.configure(language, topics);
    if (this.bag.length === 0) this.reshuffle(language, topics);
    return this.bag.pop()!;
  }

  /** Puts an undone word back on top so it is the very next card. */
  giveBack(word: Word) {
    this.bag.push(word);
  }

  get remaining() {
    return this.bag.length;
  }
}

export const wordPool = new WordPool();
