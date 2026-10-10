import { makeAutoObservable } from "mobx";
import { makeLoggable } from "mobx-log";
import { makePersistable } from "mobx-persist-store";
import { haptic } from "../lib/haptics";
import { t } from "./i18n-store";

export type Team = { id: string; name: string; score: number };

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;
/** 0 means "no target — play until you stop". */
export const TARGET_OPTIONS = [20, 30, 50, 0];

let idCounter = 0;

function makeTeam(): Team {
  idCounter += 1;
  return { id: `team-${Date.now()}-${idCounter}`, name: "", score: 0 };
}

/** Empty name falls back to a localized default, so it follows the UI language. */
export function teamLabel(team: Team, index: number): string {
  return team.name.trim() || `${t("team")} ${index + 1}`;
}

class TeamsStore {
  teams: Team[] = [makeTeam(), makeTeam()];
  currentIndex = 0;
  targetScore = 30;
  penaltyForSkip = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    makeLoggable(this);
    makePersistable(this, {
      name: "TeamsStore",
      properties: ["teams", "currentIndex", "targetScore", "penaltyForSkip"],
      storage: window.localStorage,
    });
  }

  get current(): Team {
    return this.teams[this.currentIndex] ?? this.teams[0];
  }

  get currentLabel(): string {
    return teamLabel(this.current, this.currentIndex);
  }

  get isLastInCycle(): boolean {
    return this.currentIndex === this.teams.length - 1;
  }

  /** Winner is only declared once every team has had the same number of turns. */
  get gameWinner(): Team | null {
    if (!this.targetScore || !this.isLastInCycle) return null;
    const ranked = [...this.teams].sort((a, b) => b.score - a.score);
    if (ranked[0].score < this.targetScore) return null;
    // A tie at the top means nobody has won yet — play another cycle.
    if (ranked[1] && ranked[1].score === ranked[0].score) return null;
    return ranked[0];
  }

  get winnerIndex(): number {
    const winner = this.gameWinner;
    return winner ? this.teams.findIndex((team) => team.id === winner.id) : -1;
  }

  rename(id: string, name: string) {
    const team = this.teams.find((item) => item.id === id);
    if (team) team.name = name.slice(0, 16);
  }

  addTeam() {
    if (this.teams.length >= MAX_TEAMS) return;
    haptic("light");
    this.teams.push(makeTeam());
  }

  removeTeam(id: string) {
    if (this.teams.length <= MIN_TEAMS) return;
    haptic("light");
    this.teams = this.teams.filter((team) => team.id !== id);
    if (this.currentIndex >= this.teams.length) this.currentIndex = 0;
  }

  /** Applies a correction to the current team without re-adding the whole round. */
  adjustScore(delta: number) {
    if (delta === 0) return;
    this.current.score = Math.max(0, this.current.score + delta);
  }

  addScore(points: number) {
    this.current.score = Math.max(0, this.current.score + points);
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.teams.length;
  }

  resetScores() {
    haptic("light");
    this.teams.forEach((team) => (team.score = 0));
    this.currentIndex = 0;
  }

  /** Factory reset: teams, names, scores and round settings. Language is kept. */
  resetAll() {
    this.teams = [makeTeam(), makeTeam()];
    this.currentIndex = 0;
    this.targetScore = 30;
    this.penaltyForSkip = false;
  }

  changeTargetScore(score: number) {
    haptic("selection");
    this.targetScore = score;
  }

  togglePenaltyForSkip() {
    haptic("selection");
    this.penaltyForSkip = !this.penaltyForSkip;
  }
}

export const teamsStore = new TeamsStore();
