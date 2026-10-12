/**
 * Live rooms: several phones playing one game.
 *
 *   POST /api/room                  { state }        → 201 { code, v, now }
 *   GET  /api/room?code=1234&v=7                     → 200 { v, now, state? }  (no state when v is current)
 *   PUT  /api/room?code=1234        { base, state }  → 200 { v, now } | 409 { v, now, state }
 *   POST /api/room?flags            { word }         → 200  (a player flagged a word as bad)
 *   GET  /api/room?flags                             → 200 { flags: { word: count } }
 *
 * Each room is one Redis hash: `v` (version) and `s` (the game state as JSON).
 * A write only lands if `base` is still the current version (compare-and-set),
 * so two phones tapping at once can't silently overwrite each other — the loser
 * gets 409 with the winning state and adopts it.
 */

const CODE_PATTERN = /^\d{4}$/;
const TTL_SECONDS = 60 * 60 * 24;
const MAX_STATE_LENGTH = 64 * 1024;

type Stored = { v: number; state: string };

type WriteResult =
  | { kind: "ok"; v: number }
  | { kind: "conflict"; v: number; state: string }
  | { kind: "missing" };

interface RoomStorage {
  read(code: string): Promise<Stored | null>;
  /** False when the code is already taken. */
  create(code: string, state: string): Promise<boolean>;
  write(code: string, base: number, state: string): Promise<WriteResult>;
  /** Counts one more report that a word doesn't exist or is pointless. */
  flag(word: string): Promise<void>;
  flags(): Promise<Record<string, number>>;
}

class NotConfiguredError extends Error {}

// ------------------------------------------------------------------ Upstash

const CREATE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('HSET', KEYS[1], 'v', 1, 's', ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1`;

const WRITE_SCRIPT = `
local current = redis.call('HGET', KEYS[1], 'v')
if not current then return {-1} end
current = tonumber(current)
if current ~= tonumber(ARGV[1]) then
  return {0, current, redis.call('HGET', KEYS[1], 's')}
end
redis.call('HSET', KEYS[1], 'v', current + 1, 's', ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return {1, current + 1}`;

/** Upstash Redis over its REST API, with the env vars the Vercel integration injects. */
function upstashStorage(): RoomStorage {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  async function run(command: (string | number)[]): Promise<unknown> {
    if (!url || !token) throw new NotConfiguredError();
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(command),
    });
    const body = (await response.json()) as { result?: unknown; error?: string };
    if (!response.ok || body.error) {
      throw new Error(`Upstash ${response.status}: ${body.error ?? "unknown error"}`);
    }
    return body.result;
  }

  const key = (code: string) => `alias:room:${code}`;
  const flagsKey = "alias:flags";

  return {
    async read(code) {
      const [v, state] = (await run(["HMGET", key(code), "v", "s"])) as (string | null)[];
      return v && state ? { v: Number(v), state } : null;
    },
    async create(code, state) {
      return (await run(["EVAL", CREATE_SCRIPT, 1, key(code), state, TTL_SECONDS])) === 1;
    },
    async write(code, base, state) {
      const [kind, v, current] = (await run([
        "EVAL", WRITE_SCRIPT, 1, key(code), base, state, TTL_SECONDS,
      ])) as [number, number?, string?];
      if (kind === 1) return { kind: "ok", v: v! };
      if (kind === 0) return { kind: "conflict", v: v!, state: current! };
      return { kind: "missing" };
    },
    async flag(word) {
      await run(["HINCRBY", flagsKey, word, 1]);
    },
    async flags() {
      // HGETALL comes back flat: [field, value, field, value, ...]
      const flat = ((await run(["HGETALL", flagsKey])) ?? []) as string[];
      const counts: Record<string, number> = {};
      for (let i = 0; i < flat.length; i += 2) counts[flat[i]] = Number(flat[i + 1]);
      return counts;
    },
  };
}

/** Same contract kept in memory, for `vite dev` where there is no Redis. */
export function memoryStorage(): RoomStorage {
  const rooms = new Map<string, Stored>();
  const flagged = new Map<string, number>();
  return {
    async flag(word) {
      flagged.set(word, (flagged.get(word) ?? 0) + 1);
    },
    async flags() {
      return Object.fromEntries(flagged);
    },
    async read(code) {
      return rooms.get(code) ?? null;
    },
    async create(code, state) {
      if (rooms.has(code)) return false;
      rooms.set(code, { v: 1, state });
      return true;
    },
    async write(code, base, state) {
      const room = rooms.get(code);
      if (!room) return { kind: "missing" };
      if (room.v !== base) return { kind: "conflict", v: room.v, state: room.state };
      room.v += 1;
      room.state = state;
      return { kind: "ok", v: room.v };
    },
  };
}

// ------------------------------------------------------------------ handler

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ...body, now: Date.now() }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function randomCode(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(value % 10000).padStart(4, "0");
}

/** The state as a JSON string, or null when the body isn't a sane game state. */
async function readState(request: Request): Promise<{ base: number; state: string } | null> {
  try {
    const body = (await request.json()) as { base?: unknown; state?: unknown };
    if (typeof body.state !== "object" || body.state === null) return null;
    const state = JSON.stringify(body.state);
    if (state.length > MAX_STATE_LENGTH) return null;
    return { base: Number(body.base ?? 0), state };
  } catch {
    return null;
  }
}

async function handleFlags(request: Request, storage: RoomStorage): Promise<Response> {
  if (request.method === "GET") return reply(200, { flags: await storage.flags() });
  if (request.method !== "POST") return reply(405, { error: "method-not-allowed" });
  const body = (await request.json().catch(() => null)) as { word?: unknown } | null;
  const word = typeof body?.word === "string" ? body.word.trim().toLowerCase() : "";
  if (!word || word.length > 60) return reply(400, { error: "bad-word" });
  await storage.flag(word);
  return reply(200, { ok: true });
}

export async function handleRoom(request: Request, storage: RoomStorage): Promise<Response> {
  try {
    if (new URL(request.url).searchParams.has("flags")) return await handleFlags(request, storage);

    if (request.method === "POST") {
      const body = await readState(request);
      if (!body) return reply(400, { error: "bad-state" });
      for (let attempt = 0; attempt < 20; attempt++) {
        const code = randomCode();
        if (await storage.create(code, body.state)) return reply(201, { code, v: 1 });
      }
      return reply(503, { error: "no-free-codes" });
    }

    const code = new URL(request.url).searchParams.get("code") ?? "";
    if (!CODE_PATTERN.test(code)) return reply(400, { error: "bad-code" });

    if (request.method === "GET") {
      const room = await storage.read(code);
      if (!room) return reply(404, { error: "not-found" });
      const known = Number(new URL(request.url).searchParams.get("v"));
      if (known === room.v) return reply(200, { v: room.v });
      return reply(200, { v: room.v, state: JSON.parse(room.state) });
    }

    if (request.method === "PUT") {
      const body = await readState(request);
      if (!body) return reply(400, { error: "bad-state" });
      const result = await storage.write(code, body.base, body.state);
      if (result.kind === "missing") return reply(404, { error: "not-found" });
      if (result.kind === "conflict") {
        return reply(409, { v: result.v, state: JSON.parse(result.state) });
      }
      return reply(200, { v: result.v });
    }

    return reply(405, { error: "method-not-allowed" });
  } catch (error) {
    if (error instanceof NotConfiguredError) return reply(503, { error: "not-configured" });
    console.error(error);
    return reply(500, { error: "storage-failed" });
  }
}

// Vercel's web-standard function signature; one handler for every method.
export default {
  fetch(request: Request) {
    return handleRoom(request, upstashStorage());
  },
};
