import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";

/** Look-back before the previous complete check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Pages read per check; a longer window is drained over successive checks (resume position). */
export const MAX_PAGES = 5;
/** Above MAX_PAGES x the page size, so an overlap re-list never evicts an id emitted last check. */
export const SEEN_WINDOW = 1_000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface WalkState {
  v: 1;
  kind: "ids";
  seeded: true;
  /** Emitted ids, oldest first, capped at SEEN_WINDOW. */
  ids: string[];
  /** Epoch ms of the last COMPLETE check (the window start for the next one). */
  cursor: number;
  /** Epoch ms of the seed: a record created before it is never emitted. */
  floor: number;
  /** Next page request while a window longer than MAX_PAGES pages is being drained. */
  resume?: Record<string, unknown>;
  /** Epoch ms of the check that began the drain in `resume`; the cursor lands here when it ends. */
  windowStart?: number;
  /** Vendor position (last id / event id) when the vendor pages by position, not by time. */
  mark?: unknown;
}

export interface WalkSpec<P> {
  key: string;
  title: string;
  description: string;
  /** The EXISTING list action; its `execute` is called with the request below. */
  action: ActionDefinition<never>;
  /** Request for the first page of a window; `mark` is the stored vendor position, if any. */
  first(o: { sinceMs: number; floor: number; mark: unknown; params: P }): Record<string, unknown>;
  /** Request for the page after `req`, or undefined when the window is drained. */
  next(
    req: Record<string, unknown>,
    result: unknown,
    got: unknown[],
  ): Record<string, unknown> | undefined;
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  /** Creation epoch ms of an item; undefined (unparseable / absent) keeps the item. */
  stampOf?(item: unknown): number | undefined;
  /** New vendor position after a check, from the items it read (previous mark if none). */
  markOf?(prev: unknown, read: unknown[]): unknown;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}

function valid(s: unknown): s is WalkState {
  const x = s as Partial<WalkState> | null;
  return !!x && typeof x === "object" && x.v === 1 && x.kind === "ids" && x.seeded === true &&
    Array.isArray(x.ids) && typeof x.cursor === "number" && typeof x.floor === "number";
}

/**
 * Shape (b): the wrapped list action filters by a since stamp / position but has no newest-first
 * order. The first check stores `floor = now` and reads nothing. Later checks re-ask from
 * `cursor - OVERLAP_MS`, drop records created before `floor`, dedupe by id, and when the window
 * holds more than MAX_PAGES pages store the next request in `resume` and hold the cursor until the
 * window is drained, then set it to the tick that began the drain (`windowStart`), so a record
 * created while the drain ran is re-read by the next check instead of skipped.
 */
export function walkTrigger<P>(spec: WalkSpec<P>): TriggerDefinition<P> {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(
      `trigger "${spec.key}": action "${spec.action.key}" has type "${spec.action.type}"; ` +
        `only "read" or "search" actions may back a poll trigger`,
    );
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ params, state }, ctx: HookContext) {
      const now = clock.now();
      if (!valid(state)) {
        const seed: WalkState = {
          v: 1,
          kind: "ids",
          seeded: true,
          ids: [],
          cursor: now,
          floor: now,
        };
        return { events: [], nextState: seed };
      }
      // A drain that spans checks began at `windowStart`; records created after that moment may
      // not have been in the pages read, so the cursor must return there, not jump to `now`.
      const windowStart = state.resume ? (state.windowStart ?? state.cursor) : now;
      const seen = new Set(state.ids);
      const events: unknown[] = [];
      const read: unknown[] = [];
      let req: Record<string, unknown> | undefined = state.resume ?? spec.first({
        sinceMs: state.cursor - OVERLAP_MS,
        floor: state.floor,
        mark: state.mark,
        params: params as P,
      });
      let truncated = false;
      for (let page = 0; req; page++) {
        if (page === MAX_PAGES) {
          truncated = true;
          break;
        }
        const result = await (spec.action.execute as (i: unknown, c: HookContext) => unknown)(
          req,
          ctx,
        );
        const got = spec.items(result);
        read.push(...got);
        for (const item of got) {
          const stamp = spec.stampOf?.(item);
          if (stamp !== undefined && stamp < state.floor) continue;
          const id = spec.idOf(item);
          if (id && !seen.has(id)) {
            seen.add(id);
            events.push(item);
          }
        }
        req = spec.next(req, result, got);
      }
      const nextState: WalkState = {
        v: 1,
        kind: "ids",
        seeded: true,
        ids: [...seen].slice(-SEEN_WINDOW),
        cursor: truncated ? state.cursor : windowStart,
        floor: state.floor,
        ...(truncated && req ? { resume: req, windowStart } : {}),
        ...(spec.markOf ? { mark: spec.markOf(state.mark, read) } : {}),
      };
      return { events, nextState };
    },
  };
}
