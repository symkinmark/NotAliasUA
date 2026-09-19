import { makeAutoObservable } from "mobx";
import { makeLoggable } from "mobx-log";
import { assert } from "ts-essentials";
import { getRandomWord, resetUsedWords } from "../lib/get-random-word";
import { makePersistable } from "mobx-persist-store";
import { i18nStore } from "./i18n-store";
import { teamsStore } from "./teams-store";
import type { Language } from "../i18n/translations";
import { haptic } from "../lib/haptics";
import { routerStore } from "./router-store";

class GameStore {
  cards: string[] = [];
  skipped: string[] = [];
  guessed: string[] = [];
  secondsPerRound = 60;
  secondsLeft?: number;
  isWaitingLastWord = false;
  /** Score the team that just played earned, kept for the finish screen. */
  lastRoundScore = 0;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.resetRound();
    makeAutoObservable(this, {}, { autoBind: true });
    makeLoggable(this);
    makePersistable(this, {
      name: this.constructor.name,
      properties: ["secondsPerRound"],
      storage: window.localStorage,
    });
  }

  private addRandomCard() {
    this.cards.pop();
    this.cards.unshift(getRandomWord(i18nStore.language));
  }

  addToSkipped(word: string) {
    haptic("light");
    this.skipped.push(word);
    if (this.isWaitingLastWord) {
      this.finishRound();
      return;
    }
    this.addRandomCard();
  }

  addToCorrect(word: string) {
    haptic("light");
    this.guessed.push(word);
    if (this.isWaitingLastWord) {
      this.finishRound();
      return;
    }
    this.addRandomCard();
  }

  /** Start screen -> "pass the phone" handoff for whoever is up next. */
  goToPass() {
    haptic("light");
    this.resetRound();
    routerStore.navigate("pass");
  }

  /** The team has the phone and is ready — run the clock. */
  beginPlay() {
    haptic("light");
    this.isWaitingLastWord = false;
    this.secondsLeft = this.secondsPerRound;
    this.clearTimer();
    this.intervalId = setInterval(this.handleTimerTick, 1000);
    routerStore.navigate("game");
  }

  private handleTimerTick() {
    assert(this.secondsLeft);
    this.secondsLeft--;
    if (this.secondsLeft === 0) {
      this.clearTimer();
      this.isWaitingLastWord = true;
      haptic("heavy");
    }
  }

  private finishRound() {
    this.clearTimer();
    const penalty = teamsStore.penaltyForSkip ? this.skipped.length : 0;
    this.lastRoundScore = this.guessed.length - penalty;
    teamsStore.addScore(this.lastRoundScore);
    routerStore.navigate("finish");
  }

  /** Hand over to the next team and go back to the pass screen. */
  nextTeam() {
    haptic("light");
    teamsStore.next();
    this.resetRound();
    routerStore.navigate("pass");
  }

  newGame() {
    haptic("light");
    teamsStore.resetScores();
    this.resetRound();
    routerStore.navigate("start-modal");
  }

  backToStart() {
    haptic("light");
    this.resetRound();
    routerStore.navigate("start-modal");
  }

  changeSecondsPerRound(seconds: number) {
    haptic("selection");
    this.secondsPerRound = seconds;
  }

  private clearTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private resetRound() {
    this.clearTimer();
    this.isWaitingLastWord = false;
    this.secondsLeft = undefined;
    this.skipped = [];
    this.guessed = [];
    this.cards = [
      getRandomWord(i18nStore.language),
      getRandomWord(i18nStore.language),
    ];
  }

  changeLanguage(lang: Language) {
    if (lang === i18nStore.language) return;
    haptic("selection");
    i18nStore.setLanguage(lang);
    resetUsedWords();
    this.resetRound();
  }

  get currentCard() {
    return this.cards[this.cards.length - 1];
  }

  get nextCard() {
    return this.cards[this.cards.length - 2];
  }

  get isWarning() {
    if (this.secondsLeft === undefined) {
      return false;
    }
    return this.secondsLeft <= 10;
  }
}

export const gameStore = new GameStore();
