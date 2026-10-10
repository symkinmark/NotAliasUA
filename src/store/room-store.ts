import { makeAutoObservable, reaction } from "mobx";
import { makePersistable } from "mobx-persist-store";
import { gameStore } from "./game-store";
import { teamsStore } from "./teams-store";
import { i18nStore } from "./i18n-store";
import { routerStore } from "./router-store";
import { wordPool } from "../lib/word-pool";
import { deviceId } from "../lib/device-id";
import { roomApi, RoomError, type RoomProblem } from "../lib/room-api";

/** Bump when the shape of the shared state changes, so mixed app versions can't corrupt a room. */
const SCHEMA = 1;
const CODE_PATTERN = /^\d{4}$/;
/** Spectators want the next word fast; on the menus a beat of lag is fine and halves the requests. */
const POLL_MS_IN_ROUND = 1000;
const POLL_MS_OTHERWISE = 2000;

type Screen = typeof routerStore.screen;
type Phase = "start" | "pass" | "game" | "finish";

/** Sub-screens like settings or teams are personal; only the game flow is shared. */
function phaseOf(screen: Screen): Phase {
  return screen === "pass" || screen === "game" || screen === "finish" ? screen : "start";
}

/** The whole shared game. Purely local bits (open sub-screen, the ticking seconds) stay out. */
function snapshot() {
  return {
    schema: SCHEMA,
    language: i18nStore.language,
    phase: phaseOf(routerStore.screen),
    deck: wordPool.state,
    teams: teamsStore.shared,
    game: gameStore.shared,
  };
}

type RoomState = ReturnType<typeof snapshot>;

function applySnapshot(state: RoomState) {
  i18nStore.setLanguage(state.language);
  wordPool.restore(state.deck);
  teamsStore.applyShared(state.teams);
  gameStore.applyShared(state.game);
  if (phaseOf(routerStore.screen) !== state.phase) {
    routerStore.navigate(state.phase === "start" ? "start-modal" : state.phase);
  }
}

/**
 * Keeps this phone's game in sync with a room on the server.
 *
 * Local changes are noticed by a MobX reaction and written straight away; other
 * phones' changes arrive by polling. Every write names the version it was based
 * on, and if someone else got there first we take their state instead — so all
 * phones always converge on one game.
 */
class RoomStore {
  /** Persisted, so a phone that reloads mid-game drops straight back into its room. */
  code: string | null = null;
  status: "idle" | "connecting" | "live" | "offline" | "outdated" = "idle";
  /** Why the last create/join failed, for the room screen. */
  problem: RoomProblem | null = null;

  /** Server version of the state this phone last saw or wrote. */
  private version = 0;
  /** JSON of that state: a local snapshot that differs from it is an unsent change. */
  private synced = "";
  private isWriting = false;
  private isPolling = false;
  private pollTimer?: ReturnType<typeof setTimeout>;
  private hydrated: Promise<unknown>;

  constructor() {
    makeAutoObservable<
      RoomStore,
      "version" | "synced" | "isWriting" | "isPolling" | "pollTimer" | "hydrated"
    >(
      this,
      {
        version: false,
        synced: false,
        isWriting: false,
        isPolling: false,
        pollTimer: false,
        hydrated: false,
      },
      { autoBind: true }
    );
    this.hydrated = makePersistable(this, {
      name: "RoomStore",
      properties: ["code"],
      storage: window.localStorage,
    });
  }

  get active() {
    return this.code !== null;
  }

  /** In a room only the phone that tapped "Ready" (or took over) gets the answer buttons. */
  get canAnswer() {
    return !this.active || gameStore.explainer === deviceId;
  }

  get shareUrl() {
    return this.code ? `${location.origin}/?room=${this.code}` : "";
  }

  async start() {
    await this.hydrated;
    reaction(() => (this.active ? JSON.stringify(snapshot()) : ""), this.handleLocalChange);
    document.addEventListener("visibilitychange", this.handleVisibility);

    // A shared link (?room=1234) wins over whatever room this phone was in before.
    const fromLink = new URLSearchParams(location.search).get("room");
    if (fromLink) history.replaceState(null, "", location.pathname);
    if (fromLink && CODE_PATTERN.test(fromLink) && (await this.join(fromLink))) return;
    if (this.code) await this.rejoin(this.code);
  }

  // ------------------------------------------------------------ actions

  /** Opens a room with this phone's current game in it. */
  async create() {
    this.connecting();
    const state = JSON.stringify(snapshot());
    try {
      const room = await roomApi.create(state);
      this.enterCreated(room.code, room.v, state);
    } catch (error) {
      this.fail(error);
    }
  }

  /** Joins by code, replacing this phone's game with the room's. */
  async join(code: string): Promise<boolean> {
    this.connecting();
    try {
      const room = await roomApi.read(code, 0);
      this.enterJoined(code, room.state as RoomState, room.v);
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  /** This phone goes solo again, keeping the game as it was. */
  leave(problem: RoomProblem | null = null) {
    clearTimeout(this.pollTimer);
    this.code = null;
    this.status = "idle";
    this.problem = problem;
    this.version = 0;
    this.synced = "";
  }

  // ------------------------------------------------------------ syncing

  private async rejoin(code: string) {
    this.status = "connecting";
    try {
      const room = await roomApi.read(code, 0);
      this.enterJoined(code, room.state as RoomState, room.v);
    } catch (error) {
      // Offline: keep the room and keep retrying; the first poll catches up.
      this.handleSyncError(error);
      this.schedulePoll();
    }
  }

  private handleLocalChange(json: string) {
    if (!this.active || this.status === "outdated" || json === this.synced) return;
    void this.flush();
  }

  /** Writes local changes until the server has them; on a clash, takes the server's version. */
  private async flush() {
    if (this.isWriting) return;
    this.isWriting = true;
    try {
      for (;;) {
        const code = this.code;
        const state = JSON.stringify(snapshot());
        if (!code || this.status === "outdated" || state === this.synced) break;
        const result = await roomApi.write(code, this.version, state);
        if (this.code !== code) break;
        if (result.kind === "ok") this.confirm(result.v, state);
        else this.adopt(result.state as RoomState, result.v);
      }
    } catch (error) {
      this.handleSyncError(error);
    } finally {
      this.isWriting = false;
    }
  }

  private async poll() {
    const code = this.code;
    if (!code || this.isPolling) return;
    this.isPolling = true;
    try {
      if (JSON.stringify(snapshot()) !== this.synced) {
        // Changes made while offline go out first.
        await this.flush();
      } else if (!this.isWriting) {
        const room = await roomApi.read(code, this.version);
        // Ignore answers overtaken by our own write while the request was out.
        if (room.state !== undefined && room.v > this.version && !this.isWriting && this.code === code) {
          this.adopt(room.state as RoomState, room.v);
        }
        this.markLive();
      }
    } catch (error) {
      this.handleSyncError(error);
    } finally {
      this.isPolling = false;
      this.schedulePoll();
    }
  }

  private schedulePoll() {
    clearTimeout(this.pollTimer);
    if (!this.code || this.status === "outdated" || document.hidden) return;
    const delay = routerStore.screen === "game" ? POLL_MS_IN_ROUND : POLL_MS_OTHERWISE;
    this.pollTimer = setTimeout(this.poll, delay);
  }

  /** A locked phone stops polling; unlocking catches up at once. */
  private handleVisibility() {
    if (document.hidden) clearTimeout(this.pollTimer);
    else if (this.code) void this.poll();
  }

  // ------------------------------------------------------- state changes

  /** Mirrors the room's state on this phone. False when the versions can't mix. */
  private adopt(state: RoomState, v: number): boolean {
    if (state.schema > SCHEMA) {
      // Another phone runs a newer app; this one has to reload to keep playing.
      clearTimeout(this.pollTimer);
      this.status = "outdated";
      return false;
    }
    if (state.schema < SCHEMA) {
      this.leave("not-found");
      return false;
    }
    applySnapshot(state);
    this.version = v;
    this.synced = JSON.stringify(snapshot());
    return true;
  }

  private enterCreated(code: string, v: number, state: string) {
    this.code = code;
    this.version = v;
    this.synced = state;
    this.markLive();
    this.schedulePoll();
  }

  private enterJoined(code: string, state: RoomState, v: number) {
    this.code = code;
    if (!this.adopt(state, v)) return;
    this.markLive();
    this.schedulePoll();
  }

  private confirm(v: number, state: string) {
    this.version = v;
    this.synced = state;
    this.markLive();
  }

  private connecting() {
    this.status = "connecting";
    this.problem = null;
  }

  private markLive() {
    if (this.status === "outdated") return;
    this.status = "live";
    this.problem = null;
  }

  private fail(error: unknown) {
    this.problem = error instanceof RoomError ? error.problem : "network";
    if (!this.code) this.status = "idle";
  }

  private handleSyncError(error: unknown) {
    if (error instanceof RoomError && error.problem === "not-found") {
      this.leave("not-found");
      return;
    }
    if (this.status !== "outdated") this.status = "offline";
  }
}

export const roomStore = new RoomStore();
