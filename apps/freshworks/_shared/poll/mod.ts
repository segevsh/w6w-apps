/**
 * Poll kit — the cursor logic every poll trigger needs, once.
 *
 * GENERATED COPIES: `apps/<group>/_shared/poll/` are byte-identical copies of this directory made
 * by `_tools/sync-shared.ts`. Edit only `apps/_shared/poll/`, then run the tool.
 *
 * State envelope (D2): `{ v: 1, kind: "ids" | "token" | "snapshot", seeded: true, ... }`. Any other
 * `state` value (the host's initial `{}` included) is UNSEEDED: the first check records a baseline
 * and emits nothing. Every successful check returns `nextState`, and the host writes events and
 * state in one transaction, so a thrown check changes neither.
 *
 * Hash choice (D3): snapshot rows are hashed with SHA-256 via `crypto.subtle`, truncated to 12 hex
 * characters. `_tools/poll-kit-sandbox.test.ts` proves `crypto.subtle` runs inside the trigger-hook
 * sandbox worker (sandbox digest of "abc" equals the published SHA-256), so no pure-JS fallback is
 * needed.
 *
 * Pure by design: no network calls, no Deno globals, no node builtins. HTTP stays in the app's own `lib/client.ts`.
 */
import type {
  ActionDefinition,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";

export interface IdsState {
  v: 1;
  kind: "ids";
  seeded: true;
  /** Seen ids, oldest first, capped at `seenWindow` (FIFO). */
  ids: string[];
}

export interface TokenState {
  v: 1;
  kind: "token";
  seeded: true;
  token: string;
}

export interface SnapshotState {
  v: 1;
  kind: "snapshot";
  seeded: true;
  /** `{ [rowKey]: hash }` — never cell values. */
  hashes: Record<string, string>;
}

export interface SnapshotChange {
  change: "added" | "updated" | "removed";
  key: string;
  /** The row's values; `null` for a removed row (its values are not kept). */
  values: unknown;
}

function seededState<K extends string>(
  state: unknown,
  kind: K,
): Record<string, unknown> | null {
  if (typeof state !== "object" || state === null) return null;
  const s = state as Record<string, unknown>;
  return s.v === 1 && s.kind === kind && s.seeded === true ? s : null;
}

/**
 * Emit items not seen before. Pages arrive newest-first; stops at the first page holding a seen id,
 * or at `maxPages`. Unseeded: records page-1 ids and emits nothing. Events are oldest-first. If
 * more than `maxEvents` are unseen, the OLDEST `maxEvents` are emitted and only those are marked
 * seen — an item that was not emitted is never marked seen. Pure in `(state, pages)`.
 */
export async function pollNewItems<T>(o: {
  state: unknown;
  fetchPage(
    pageToken?: string,
  ): Promise<{ items: T[]; nextPageToken?: string }>;
  idOf(item: T): string;
  maxPages?: number;
  maxEvents?: number;
  seenWindow?: number;
}): Promise<{ events: T[]; nextState: IdsState }> {
  const maxPages = Math.max(1, o.maxPages ?? 3);
  const maxEvents = o.maxEvents ?? 100;
  const seenWindow = o.seenWindow ?? 200;
  const prior = seededState(o.state, "ids");
  const window = (ids: string[]): IdsState => ({
    v: 1,
    kind: "ids",
    seeded: true,
    ids: ids.slice(-seenWindow),
  });

  if (!prior || !Array.isArray(prior.ids)) {
    const first = await o.fetchPage(undefined);
    const newestFirst = unique(first.items.map((i) => o.idOf(i)));
    return { events: [], nextState: window(newestFirst.reverse()) };
  }

  const seen = new Set((prior.ids as unknown[]).map(String));
  const unseenNewestFirst: T[] = [];
  const queued = new Set<string>();
  let token: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const res = await o.fetchPage(token);
    let hitSeen = false;
    for (const item of res.items) {
      const id = o.idOf(item);
      if (seen.has(id)) {
        hitSeen = true;
      } else if (!queued.has(id)) {
        queued.add(id);
        unseenNewestFirst.push(item);
      }
    }
    if (hitSeen || !res.nextPageToken) break;
    token = res.nextPageToken;
  }

  const oldestFirst = unseenNewestFirst.reverse();
  const events = oldestFirst.slice(0, maxEvents);
  const ids = [
    ...(prior.ids as unknown[]).map(String),
    ...events.map((e) => o.idOf(e)),
  ];
  return { events, nextState: window(ids) };
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Emit what a change-token feed reports. Unseeded: `token = await seed()`, no events. If `changes`
 * throws and `isExpired(err)`, reseed and emit nothing; any other throw propagates. `changes` must
 * fetch ONE bounded page per check; more than `maxEvents` items in that page throws (the kit
 * cannot hold back part of a page behind a single token without losing or repeating events).
 */
export async function pollToken<T>(o: {
  state: unknown;
  seed(): Promise<string>;
  changes(token: string): Promise<{ items: T[]; nextToken: string }>;
  isExpired?(err: unknown): boolean;
  maxEvents?: number;
}): Promise<{ events: T[]; nextState: TokenState }> {
  const maxEvents = o.maxEvents ?? 100;
  const state = (token: string): TokenState => ({
    v: 1,
    kind: "token",
    seeded: true,
    token,
  });
  const prior = seededState(o.state, "token");
  if (!prior || typeof prior.token !== "string") {
    return { events: [], nextState: state(await o.seed()) };
  }
  let res: { items: T[]; nextToken: string };
  try {
    res = await o.changes(prior.token);
  } catch (err) {
    if (o.isExpired?.(err)) {
      return { events: [], nextState: state(await o.seed()) };
    }
    throw err;
  }
  if (res.items.length > maxEvents) {
    throw new Error(
      `pollToken: ${res.items.length} changes in one page exceeds maxEvents (${maxEvents}); ` +
        "fetch a smaller page",
    );
  }
  return { events: res.items, nextState: state(res.nextToken) };
}

function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const o = val as Record<string, unknown>;
      return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
    }
    return val;
  }) ?? "null";
}

async function rowHash(values: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical(values)),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

/**
 * Emit added / updated / removed rows by comparing per-row hashes. Default emits added + updated;
 * `removed` is opt-in. Unseeded: stores the hashes, no events. State holds only `{ key: hash }`,
 * never cell values. More than `maxRows` rows throws an Error naming the cap. Duplicate keys throw.
 */
export async function pollSnapshot(o: {
  state: unknown;
  rows: Array<{ key: string; values: unknown }>;
  emit?: { added?: boolean; updated?: boolean; removed?: boolean };
  maxRows?: number;
}): Promise<{ events: SnapshotChange[]; nextState: SnapshotState }> {
  const maxRows = o.maxRows ?? 5000;
  if (o.rows.length > maxRows) {
    throw new Error(
      `pollSnapshot: ${o.rows.length} rows exceeds the ${maxRows}-row cap; narrow the range`,
    );
  }
  const emit = { added: true, updated: true, removed: false, ...o.emit };
  const hashes: Record<string, string> = {};
  for (const row of o.rows) {
    if (Object.hasOwn(hashes, row.key)) {
      throw new Error(
        `pollSnapshot: duplicate row key ${JSON.stringify(row.key)}`,
      );
    }
    hashes[row.key] = await rowHash(row.values);
  }
  const nextState: SnapshotState = {
    v: 1,
    kind: "snapshot",
    seeded: true,
    hashes,
  };
  const prior = seededState(o.state, "snapshot");
  if (!prior || typeof prior.hashes !== "object" || prior.hashes === null) {
    return { events: [], nextState };
  }
  const before = prior.hashes as Record<string, string>;
  const events: SnapshotChange[] = [];
  for (const row of o.rows) {
    if (!Object.hasOwn(before, row.key)) {
      if (emit.added) {
        events.push({ change: "added", key: row.key, values: row.values });
      }
    } else if (before[row.key] !== hashes[row.key]) {
      if (emit.updated) {
        events.push({ change: "updated", key: row.key, values: row.values });
      }
    }
  }
  if (emit.removed) {
    for (const key of Object.keys(before).sort()) {
      if (!Object.hasOwn(hashes, key)) {
        events.push({ change: "removed", key, values: null });
      }
    }
  }
  return { events, nextState };
}

/**
 * A poll trigger built on an app's existing read/search action: `poll` calls
 * `spec.action.execute(spec.input(params), ctx)` — the same request, client and auth as the action —
 * and feeds `pollNewItems`. The list MUST be newest-first. Events are the raw items. Throws at
 * definition time unless `action.type` is `"read"` or `"search"`.
 */
export function pollFromListAction<P = Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  input(params: P): Record<string, unknown>;
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  nextPageInput?(
    input: Record<string, unknown>,
    result: unknown,
  ): Record<string, unknown> | undefined;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
  maxPages?: number;
}): TriggerDefinition<P> {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(
      `pollFromListAction(${spec.key}): action "${spec.action.key}" has type "${spec.action.type}"; ` +
        'only "read" or "search" actions may back a poll trigger',
    );
  }
  const maxPages = spec.maxPages ?? 1;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ params, state }, ctx) {
      const inputs: Array<Record<string, unknown>> = [spec.input(params)];
      const { events, nextState } = await pollNewItems<unknown>({
        state,
        maxPages,
        idOf: spec.idOf,
        async fetchPage(pageToken) {
          const index = pageToken === undefined ? 0 : Number(pageToken);
          const result = await spec.action.execute(inputs[index], ctx);
          const next = spec.nextPageInput?.(inputs[index], result);
          let nextPageToken: string | undefined;
          if (next) {
            inputs[index + 1] = next;
            nextPageToken = String(index + 1);
          }
          return { items: spec.items(result), nextPageToken };
        },
      });
      return { events, nextState };
    },
  };
}
