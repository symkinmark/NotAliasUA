import { makeAutoObservable } from "mobx";
import { makePersistable } from "mobx-persist-store";
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

/**
 * Ukrainian is the tagged list; en/ru are plain and get neutral tags.
 * A word may be listed under several topics (вулик is nature and beekeeping),
 * so this has one entry per topic membership.
 */
const ukrainian: Word[] = (rawUkrainian as RawWord[]).map(([text, topic, difficulty]) => ({
  text,
  topic,
  difficulty,
}));

/** Keeps the first listing of each word, so the deck never shows it twice. */
function uniqueByText(words: Word[]): Word[] {
  const seen = new Set<string>();
  return words.filter((word) => {
    const key = word.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const ukrainianDeck = uniqueByText(ukrainian);

function untagged(words: string[]): Word[] {
  return words.map((text) => ({ text, topic: "abstract" as TopicId, difficulty: 2 as Difficulty }));
}

const byLanguage: Record<Language, Word[]> = {
  uk: ukrainianDeck,
  en: untagged(englishWords),
  ru: untagged(russianWords),
};

/** Only Ukrainian carries topic and difficulty tags. */
export function isTagged(language: Language) {
  return language === "uk";
}

/** Every topic a Ukrainian word is listed under. */
export function topicsOf(text: string): TopicId[] {
  const key = text.toLowerCase();
  return ukrainian.filter((word) => word.text.toLowerCase() === key).map((word) => word.topic);
}

export function countsByTopic(): Record<TopicId, number> {
  const counts = Object.fromEntries(topicIds.map((id) => [id, 0])) as Record<TopicId, number>;
  for (const word of ukrainian) counts[word.topic] += 1;
  return counts;
}

/** Distinct words in a topic selection; a word shared by two chosen topics counts once. */
export function countFor(topics: TopicId[]): number {
  if (topics.length === 0) return ukrainianDeck.length;
  const wanted = new Set(topics);
  return uniqueByText(ukrainian.filter((word) => wanted.has(word.topic))).length;
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
  /** Words flagged on this phone as non-existent or pointless; never drawn here again. */
  hidden: string[] = [];
  private cache = { key: "", order: [] as Word[] };

  constructor() {
    makeAutoObservable<WordPool, "cache">(this, { cache: false }, { autoBind: true });
    makePersistable(this, {
      name: "WordPool",
      properties: ["hidden"],
      storage: window.localStorage,
    });
  }

  private sourceFor(language: Language, topics: TopicId[]): Word[] {
    const all = byLanguage[language];
    if (!isTagged(language) || topics.length === 0) return all;
    const wanted = new Set(topics);
    const picked = uniqueByText(ukrainian.filter((word) => wanted.has(word.topic)));
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

  private wordAt(source: Word[], cursor: number): Word {
    const lap = Math.floor(cursor / source.length);
    return this.orderFor(source, lap)[cursor % source.length];
  }

  draw(language: Language, topics: TopicId[]): Word {
    this.configure(language, topics);
    const source = this.sourceFor(language, topics);
    // Hidden words are stepped over rather than removed from the order, so the
    // shared seed and cursor still line up with other phones, and undo (one
    // step back) lands on the same word again.
    const hidden = new Set(this.hidden);
    for (let tries = 0; tries < source.length; tries++) {
      const word = this.wordAt(source, this.cursor);
      this.cursor += 1;
      if (!hidden.has(word.text.toLowerCase())) return word;
    }
    const word = this.wordAt(source, this.cursor);
    this.cursor += 1;
    return word;
  }

  /** True when the word wasn't hidden yet. */
  hide(text: string): boolean {
    const key = text.toLowerCase();
    if (this.hidden.includes(key)) return false;
    this.hidden.push(key);
    return true;
  }

  unhide(text: string) {
    const key = text.toLowerCase();
    this.hidden = this.hidden.filter((item) => item !== key);
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
