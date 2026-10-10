import { makeAutoObservable } from "mobx";
import { makeLoggable } from "mobx-log";
import { makePersistable } from "mobx-persist-store";
import { wordPool, isTagged, type Word } from "../lib/word-pool";
import { topicIds, type TopicId } from "../lib/topics";
import { i18nStore } from "./i18n-store";
import { teamsStore } from "./teams-store";
import type { Language } from "../i18n/translations";
import { haptic } from "../lib/haptics";
import { routerStore } from "./router-store";

export type GameMode = "classic" | "levels";

type Decision = { word: Word; kind: "correct" | "skip" };

class GameStore {
  cards: Word[] = [];
  skipped: Word[] = [];
  guessed: Word[] = [];
  /** Lets the player take back a mis-tap during the round. */
  history: Decision[] = [];
  secondsPerRound = 60;
  secondsLeft?: number;
  isWaitingLastWord = false;
  lastRoundScore = 0;
  mode: GameMode = "classic";
  /** Empty means every topic. */
  selectedTopics: TopicId[] = [];
  /** Wall-clock end of the round, so the timer survives a backgrounded tab. */
  private deadline?: number;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.resetRound();
    makeAutoObservable(this, {}, { autoBind: true });
    makeLoggable(this);
    makePersistable(this, {
      name: "GameStore",
      properties: ["secondsPerRound", "mode", "selectedTopics"],
      storage: window.localStorage,
    });
  }

  // ---------------------------------------------------------------- deck

  private draw(): Word {
    return wordPool.draw(i18nStore.language, this.topicsInEffect);
  }

  get topicsInEffect(): TopicId[] {
    return isTagged(i18nStore.language) ? this.selectedTopics : [];
  }

  private advanceCard() {
    this.cards.pop();
    this.cards.unshift(this.draw());
  }

  get currentCard(): Word | undefined {
    return this.cards[this.cards.length - 1];
  }

  get nextCard(): Word | undefined {
    return this.cards[this.cards.length - 2];
  }

  /** Levels scoring needs tagged words, which only Ukrainian has. */
  get isLevelsActive() {
    return this.mode === "levels" && isTagged(i18nStore.language);
  }

  /** What one word is worth right now. */
  pointsFor(word: Word) {
    return this.isLevelsActive ? word.difficulty : 1;
  }

  get roundPoints() {
    const gained = this.guessed.reduce((sum, word) => sum + this.pointsFor(word), 0);
    const penalty = teamsStore.penaltyForSkip ? this.skipped.length : 0;
    return gained - penalty;
  }

  // ------------------------------------------------------------- playing

  addToCorrect(word: Word) {
    haptic("light");
    this.guessed.push(word);
    this.history.push({ word, kind: "correct" });
    if (this.isWaitingLastWord) {
      this.finishRound();
      return;
    }
    this.advanceCard();
  }

  addToSkipped(word: Word) {
    haptic("light");
    this.skipped.push(word);
    this.history.push({ word, kind: "skip" });
    if (this.isWaitingLastWord) {
      this.finishRound();
      return;
    }
    this.advanceCard();
  }

  get canUndo() {
    return this.history.length > 0;
  }

  /** Takes back the last answer and puts that word back on top of the deck. */
  undo() {
    const last = this.history.pop();
    if (!last) return;
    haptic("medium");
    if (last.kind === "correct") {
      this.guessed.splice(this.guessed.lastIndexOf(last.word), 1);
    } else {
      this.skipped.splice(this.skipped.lastIndexOf(last.word), 1);
    }
    // Return the card we drew to replace it, then restore the original.
    const replacement = this.cards.shift();
    if (replacement) wordPool.giveBack(replacement);
    this.cards.push(last.word);
  }

  // ------------------------------------------------------- fixing results

  /** On the results screen a word can be flipped between correct and skipped. */
  markSkipped(word: Word) {
    const index = this.guessed.indexOf(word);
    if (index < 0) return;
    haptic("selection");
    this.guessed.splice(index, 1);
    this.skipped.push(word);
    this.recommitRound();
  }

  markCorrect(word: Word) {
    const index = this.skipped.indexOf(word);
    if (index < 0) return;
    haptic("selection");
    this.skipped.splice(index, 1);
    this.guessed.push(word);
    this.recommitRound();
  }

  private recommitRound() {
    const updated = this.roundPoints;
    teamsStore.adjustScore(updated - this.lastRoundScore);
    this.lastRoundScore = updated;
  }

  // --------------------------------------------------------------- flow

  goToPass() {
    haptic("light");
    this.resetRound();
    routerStore.navigate("pass");
  }

  beginPlay() {
    haptic("light");
    this.isWaitingLastWord = false;
    this.secondsLeft = this.secondsPerRound;
    this.deadline = Date.now() + this.secondsPerRound * 1000;
    this.clearTimer();
    this.intervalId = setInterval(this.handleTimerTick, 250);
    routerStore.navigate("game");
  }

  private handleTimerTick() {
    if (this.deadline === undefined) {
      this.clearTimer();
      return;
    }
    // Derived from the clock, not decremented, so a throttled or coalesced
    // interval can neither run past zero nor drift.
    const remaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
    if (remaining === this.secondsLeft) return;
    this.secondsLeft = remaining;
    if (remaining === 0) {
      this.clearTimer();
      this.deadline = undefined;
      this.isWaitingLastWord = true;
      haptic("heavy");
    }
  }

  private finishRound() {
    this.clearTimer();
    this.deadline = undefined;
    this.lastRoundScore = this.roundPoints;
    teamsStore.addScore(this.lastRoundScore);
    routerStore.navigate("finish");
  }

  nextTeam() {
    haptic("light");
    teamsStore.next();
    this.resetRound();
    routerStore.navigate("pass");
  }

  /** Only for starting over after a win — this wipes every score. */
  newGame() {
    haptic("light");
    teamsStore.resetScores();
    this.resetRound();
    routerStore.navigate("start-modal");
  }

  /** Leave the results without losing anything; the next turn is the next team's. */
  exitToStart() {
    haptic("light");
    teamsStore.next();
    this.resetRound();
    routerStore.navigate("start-modal");
  }

  backToStart() {
    haptic("light");
    this.resetRound();
    routerStore.navigate("start-modal");
  }

  // ------------------------------------------------------------ settings

  /** Wipes teams, scores and round settings, then returns to the start screen. */
  resetEverything() {
    haptic("heavy");
    teamsStore.resetAll();
    this.secondsPerRound = 60;
    this.mode = "classic";
    this.selectedTopics = [];
    wordPool.reshuffle(i18nStore.language, []);
    this.resetRound();
    routerStore.navigate("start-modal");
  }

  changeSecondsPerRound(seconds: number) {
    haptic("selection");
    this.secondsPerRound = seconds;
  }

  changeMode(mode: GameMode) {
    haptic("selection");
    this.mode = mode;
  }

  toggleTopic(topic: TopicId) {
    haptic("selection");
    const chosen = this.selectedTopics.length === 0 ? [...topicIds] : this.selectedTopics;
    this.selectedTopics = chosen.includes(topic)
      ? chosen.filter((id) => id !== topic)
      : [...chosen, topic];
    // Deselecting everything means everything, not nothing.
    if (this.selectedTopics.length === 0) this.selectedTopics = [];
    this.resetRound();
  }

  selectAllTopics() {
    haptic("selection");
    this.selectedTopics = [];
    this.resetRound();
  }

  selectOnlyTopic(topic: TopicId) {
    haptic("selection");
    this.selectedTopics = [topic];
    this.resetRound();
  }

  get isTopicOn() {
    const chosen = this.selectedTopics;
    return (topic: TopicId) => chosen.length === 0 || chosen.includes(topic);
  }

  get activeTopicCount() {
    return this.selectedTopics.length === 0 ? topicIds.length : this.selectedTopics.length;
  }

  /** Fresh order for the whole selection, nothing used yet. */
  shuffleDeck() {
    haptic("medium");
    wordPool.reshuffle(i18nStore.language, this.topicsInEffect);
    this.resetRound();
  }

  changeLanguage(lang: Language) {
    if (lang === i18nStore.language) return;
    haptic("selection");
    i18nStore.setLanguage(lang);
    wordPool.reshuffle(lang, isTagged(lang) ? this.selectedTopics : []);
    this.resetRound();
  }

  // ----------------------------------------------------------- internals

  private clearTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private resetRound() {
    this.clearTimer();
    this.deadline = undefined;
    this.isWaitingLastWord = false;
    this.secondsLeft = undefined;
    this.skipped = [];
    this.guessed = [];
    this.history = [];
    this.cards = [this.draw(), this.draw()];
  }

  get isWarning() {
    if (this.secondsLeft === undefined) return false;
    return this.secondsLeft <= 10;
  }
}

export const gameStore = new GameStore();
