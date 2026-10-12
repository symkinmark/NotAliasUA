import { makeAutoObservable } from "mobx";
import { makeLoggable } from "mobx-log";
import { haptic } from "../lib/haptics";

type Screen =
  | "start-modal"
  | "teams"
  | "topics"
  | "pass"
  | "game"
  | "finish"
  | "settings"
  | "room"
  | "god";

class RouterStore {
  screen: Screen = "start-modal";

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    makeLoggable(this);
  }

  navigate(screen: Screen) {
    this.screen = screen;
  }

  openSettings() {
    haptic("light");
    this.screen = "settings";
  }

  closeSettings() {
    haptic("light");
    this.screen = "start-modal";
  }

  openTeams() {
    haptic("light");
    this.screen = "teams";
  }

  openTopics() {
    haptic("light");
    this.screen = "topics";
  }

  openRoom() {
    haptic("light");
    this.screen = "room";
  }
}

export const routerStore = new RouterStore();
