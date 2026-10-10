import { calibrate } from "./clock";

/** Why a room call failed, in terms the room screen can show. */
export type RoomProblem = "not-found" | "network" | "not-configured";

export class RoomError extends Error {
  constructor(readonly problem: RoomProblem) {
    super(problem);
  }
}

type Reply = { v: number; now: number; code?: string; state?: unknown; error?: string };

async function call(method: string, query: string, body?: string) {
  const sentAt = Date.now();
  let response: Response;
  let data: Reply;
  try {
    response = await fetch(`/api/room${query}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
      cache: "no-store",
    });
    data = (await response.json()) as Reply;
  } catch {
    throw new RoomError("network");
  }
  if (typeof data.now === "number") calibrate(data.now, sentAt, Date.now());
  if (response.status === 404) throw new RoomError("not-found");
  if (data.error === "not-configured") throw new RoomError("not-configured");
  if (!response.ok && response.status !== 409) throw new RoomError("network");
  return { status: response.status, data };
}

/** `state` arrives already serialised, so the room store can compare it byte for byte. */
export const roomApi = {
  async create(state: string) {
    const { data } = await call("POST", "", `{"state":${state}}`);
    return { code: data.code!, v: data.v };
  },

  /** `state` is left out when `known` is already the latest version. */
  async read(code: string, known: number) {
    const { data } = await call("GET", `?code=${code}&v=${known}`);
    return { v: data.v, state: data.state };
  },

  /** Lands only if `base` is still current; otherwise returns the state that won. */
  async write(code: string, base: number, state: string) {
    const { status, data } = await call("PUT", `?code=${code}`, `{"base":${base},"state":${state}}`);
    return status === 409
      ? { kind: "conflict" as const, v: data.v, state: data.state }
      : { kind: "ok" as const, v: data.v };
  },
};
