import { makeAutoObservable } from "mobx";
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

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32 — integer-only maths, so every device gets the same sequence from a seed. */
function seededRandom(seed: string): () => number {
  let state = hashString(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function signatureFor(language: Language, topics: TopicId[]): string {
  return `${language}|${[...topics].sort().join(",")}`;
}

/** Everything another phone needs to draw the exact same next card. */
type DeckState = { seed: string; cursor: number; signature: string };

/**
 * A seeded deck: the order comes from `seed`, and `cursor` counts the cards drawn.
 * Every word in the selection comes up once before any repeat; each further lap
 * gets a fresh order. Phones in a room share only these three fields, never the list.
 */
class WordPool {
  seed = randomSeed();
  cursor = 0;
  signature = "";
  private cache = { key: "", order: [] as Word[] };

  constructor() {
    makeAutoObservable<WordPool, "cache">(this, { cache: false }, { autoBind: true });
  }

  private sourceFor(language: Language, topics: TopicId[]): Word[] {
    const all = byLanguage[language];
    if (!isTagged(language) || topics.length === 0) return all;
    const wanted = new Set(topics);
    const picked = all.filter((word) => wanted.has(word.topic));
    return picked.length > 0 ? picked : all;
  }

  private orderFor(source: Word[], lap: number): Word[] {
    const key = `${this.signature}|${this.seed}|${lap}`;
    if (this.cache.key !== key) {
      this.cache = { key, order: shuffled(source, seededRandom(`${this.seed}:${lap}`)) };
    }
    return this.cache.order;
  }

  /** Starts a fresh deck only when the language or topic selection actually changed. */
  configure(language: Language, topics: TopicId[]) {
    const signature = signatureFor(language, topics);
    if (signature === this.signature) return;
    this.reshuffle(language, topics);
  }

  /** Explicit reshuffle — same selection, fresh order, nothing used yet. */
  reshuffle(language: Language, topics: TopicId[]) {
    this.signature = signatureFor(language, topics);
    this.seed = randomSeed();
    this.cursor = 0;
  }

  draw(language: Language, topics: TopicId[]): Word {
    this.configure(language, topics);
    const source = this.sourceFor(language, topics);
    const lap = Math.floor(this.cursor / source.length);
    const word = this.orderFor(source, lap)[this.cursor % source.length];
    this.cursor += 1;
    return word;
  }

  /** Un-draws the most recent card so it comes up next again. */
  giveBack() {
    if (this.cursor > 0) this.cursor -= 1;
  }

  get state(): DeckState {
    return { seed: this.seed, cursor: this.cursor, signature: this.signature };
  }

  restore(state: DeckState) {
    this.seed = state.seed;
    this.cursor = state.cursor;
    this.signature = state.signature;
  }
}

export const wordPool = new WordPool();
