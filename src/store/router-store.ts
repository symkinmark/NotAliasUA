import { makeAutoObservable } from "mobx";
import { makeLoggable } from "mobx-log";
import { haptic } from "../lib/haptics";

type Screen =
  | "start-modal"
  | "teams"
  | "pass"
  | "game"
  | "finish"
  | "settings";

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
}

export const routerStore = new RouterStore();
