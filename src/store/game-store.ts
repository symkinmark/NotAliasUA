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
import { serverNow } from "../lib/clock";
import { deviceId } from "../lib/device-id";

export type GameMode = "classic" | "levels";

type Decision = { word: Word; kind: "correct" | "skip" };

class GameStore {
  cards: Word[] = [];
  skipped: Word[] = [];
  guessed: Word[] = [];
  /** Lets the player take back a mis-tap during the round. */
  history: Decision[] = [];
  /** Struck out on review after the round: counts neither as guessed nor as skipped. */
  removed: Decision[] = [];
  secondsPerRound = 60;
  secondsLeft?: number;
  isWaitingLastWord = false;
  lastRoundScore = 0;
  mode: GameMode = "classic";
  /** Empty means every topic. */
  selectedTopics: TopicId[] = [];
  /**
   * Server-clock end of the round, so the timer survives a backgrounded tab
   * and every phone in a room counts down to the same moment.
   */
  deadline?: number;
  /** The device that tapped "Ready" — in a room, only it gets the answer buttons. */
  explainer: string | null = null;
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
    const list = last.kind === "correct" ? this.guessed : this.skipped;
    const index = list.map((word) => word.text).lastIndexOf(last.word.text);
    if (index >= 0) list.splice(index, 1);
    // Return the card we drew to replace it, then restore the original.
    if (this.cards.shift()) wordPool.giveBack();
    this.cards.push(last.word);
  }

  // ------------------------------------------------------- fixing results

  /** On the results screen a word can be flipped between correct and skipped. */
  markSkipped(word: Word) {
    const index = this.guessed.findIndex((item) => item.text === word.text);
    if (index < 0) return;
    haptic("selection");
    this.guessed.splice(index, 1);
    this.skipped.push(word);
    this.recommitRound();
  }

  markCorrect(word: Word) {
    const index = this.skipped.findIndex((item) => item.text === word.text);
    if (index < 0) return;
    haptic("selection");
    this.skipped.splice(index, 1);
    this.guessed.push(word);
    this.recommitRound();
  }

  /** Review: a badly explained word stops counting either way (no point, no skip penalty). */
  removeWord(word: Word) {
    const wasGuessed = this.guessed.some((item) => item.text === word.text);
    const list = wasGuessed ? this.guessed : this.skipped;
    const index = list.findIndex((item) => item.text === word.text);
    if (index < 0) return;
    haptic("selection");
    const [taken] = list.splice(index, 1);
    this.removed.push({ word: taken, kind: wasGuessed ? "correct" : "skip" });
    this.recommitRound();
  }

  /** Puts a removed word back where it was, in case the wrong one got struck out. */
  restoreWord(word: Word) {
    const index = this.removed.findIndex((item) => item.word.text === word.text);
    if (index < 0) return;
    haptic("selection");
    const [{ word: back, kind }] = this.removed.splice(index, 1);
    (kind === "correct" ? this.guessed : this.skipped).push(back);
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
    this.explainer = deviceId;
    this.deadline = serverNow() + this.secondsPerRound * 1000;
    this.resumeTimer();
    routerStore.navigate("game");
  }

  /** In a room: a spectator phone takes the buttons, e.g. when the explainer's phone died. */
  takeOver() {
    haptic("medium");
    this.explainer = deviceId;
  }

  /** (Re)starts the local countdown from the shared deadline. */
  private resumeTimer() {
    this.clearTimer();
    this.isWaitingLastWord = false;
    this.secondsLeft = undefined;
    if (this.deadline === undefined) return;
    this.handleTimerTick();
    if (!this.isWaitingLastWord) this.intervalId = setInterval(this.handleTimerTick, 250);
  }

  private handleTimerTick() {
    if (this.deadline === undefined) {
      this.clearTimer();
      return;
    }
    // Derived from the clock, not decremented, so a throttled or coalesced
    // interval can neither run past zero nor drift.
    const remaining = Math.max(0, Math.ceil((this.deadline - serverNow()) / 1000));
    if (remaining === this.secondsLeft) return;
    this.secondsLeft = remaining;
    if (remaining === 0) {
      // The deadline stays: it is shared, and every phone reaches zero on its own.
      this.clearTimer();
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

  // --------------------------------------------------------------- rooms

  /** Everything other phones in a room need to mirror this game. */
  get shared() {
    return {
      secondsPerRound: this.secondsPerRound,
      mode: this.mode,
      selectedTopics: this.selectedTopics,
      cards: this.cards,
      guessed: this.guessed,
      skipped: this.skipped,
      history: this.history,
      removed: this.removed,
      deadline: this.deadline ?? null,
      lastRoundScore: this.lastRoundScore,
      explainer: this.explainer,
    };
  }

  applyShared(state: GameStore["shared"]) {
    this.secondsPerRound = state.secondsPerRound;
    this.mode = state.mode;
    this.selectedTopics = state.selectedTopics;
    this.cards = state.cards;
    this.guessed = state.guessed;
    this.skipped = state.skipped;
    this.history = state.history;
    // Rooms created before review existed don't carry this field.
    this.removed = state.removed ?? [];
    this.lastRoundScore = state.lastRoundScore;
    this.explainer = state.explainer;
    const deadline = state.deadline ?? undefined;
    if (deadline !== this.deadline) {
      this.deadline = deadline;
      this.resumeTimer();
    }
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
    this.explainer = null;
    this.isWaitingLastWord = false;
    this.secondsLeft = undefined;
    this.skipped = [];
    this.guessed = [];
    this.history = [];
    this.removed = [];
    this.cards = [this.draw(), this.draw()];
  }

  get isWarning() {
    if (this.secondsLeft === undefined) return false;
    return this.secondsLeft <= 10;
  }
}

export const gameStore = new GameStore();
