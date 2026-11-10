import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { type IdsState, pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Pages read per check. A window holding more pages is drained over several checks (resume). */
export const MAX_PAGES = 3;

/** Where an undrained window continues: the same window bounds and the next page's request. */
export interface Resume {
  checkedAt: number;
  input: Record<string, unknown>;
}

/**
 * The kit's ids envelope plus `cursor`, the epoch milliseconds the last FULLY DRAINED window ended
 * at. `resume` is present only while a window still has pages left (brief 9.8): the cursor does not
 * move until it is drained.
 */
export interface SinceState extends IdsState {
  cursor: number;
  /** Epoch ms stored by the seed (brief 9.9): items stamped before it are never emitted. */
  floor?: number;
  resume?: Resume;
}

const isResume = (v: unknown): v is Resume => {
  const r = v as Resume | null | undefined;
  return typeof r === "object" && r !== null && typeof r.checkedAt === "number" &&
    typeof r.input === "object" && r.input !== null;
};

/** `2026-11-10T09:58:00Z` — whole seconds, the form every vendor filter accepts. */
const stamp = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * A since-filter poll over an EXISTING list/search action: each check runs the SAME
 * `action.execute(...)` with the filter set to `cursor - OVERLAP_MS`, reads up to MAX_PAGES pages,
 * and emits ids not seen before (kit dedupe). When the window has more pages, the next page's
 * request is stored as `resume`; the following check continues from it and the cursor advances
 * only once the window is drained. The first check seeds and emits nothing.
 */
export function sinceTrigger(spec: {
  key: string;
  title: string;
  description: string;
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  pageSize: number;
  input(
    window: { since: string; until: string },
    params: Record<string, unknown>,
  ): Record<string, unknown>;
  nextPageInput?(
    input: Record<string, unknown>,
    result: unknown,
  ): Record<string, unknown> | undefined;
  items(result: unknown): unknown[];
  idOf(item: unknown): string;
  /**
   * The item's own creation stamp (for `new-or-updated-*`: its update stamp). Items stamped before
   * the seed's floor are dropped before dedupe; an item with no parseable stamp is kept (brief 9.9).
   */
  stampOf(item: unknown): unknown;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}): TriggerDefinition {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`sinceTrigger(${spec.key}): action ${spec.action.key} is not a list action`);
  }
  const maxEvents = MAX_PAGES * spec.pageSize;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ state, params }, ctx) {
      const prior = state as { cursor?: unknown; resume?: unknown; seeded?: unknown } | null;
      const resume = prior?.seeded === true && isResume(prior.resume) ? prior.resume : undefined;
      const checkedAt = resume ? resume.checkedAt : clock.now();
      const seeding = prior?.seeded !== true;
      const floor = typeof (prior as { floor?: unknown } | null)?.floor === "number"
        ? (prior as { floor: number }).floor
        : seeding
        ? checkedAt
        : undefined;
      // Vendor stamps have whole-second precision: compare at the second so a record created
      // within the seed's own second is not mistaken for a pre-seed one.
      const floorSec = floor === undefined ? undefined : floor - (floor % 1000);
      const afterFloor = (item: unknown): boolean => {
        const raw = spec.stampOf(item);
        const ms = typeof raw === "number" ? raw : typeof raw === "string" ? Date.parse(raw) : NaN;
        return floorSec === undefined || !Number.isFinite(ms) || ms >= floorSec;
      };
      const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
      let pending: Record<string, unknown> | undefined;
      const { events, nextState } = await pollNewItems<unknown>({
        state,
        maxPages: 1,
        maxEvents,
        seenWindow: maxEvents * 2,
        idOf: spec.idOf,
        async fetchPage() {
          const items: unknown[] = [];
          let input: Record<string, unknown> | undefined = resume ? resume.input : spec.input({
            since: stamp(cursor - OVERLAP_MS),
            until: stamp(checkedAt),
          }, (params ?? {}) as Record<string, unknown>);
          for (let page = 0; input && page < MAX_PAGES; page++) {
            const result = await spec.action.execute(input, ctx);
            items.push(...spec.items(result).filter(afterFloor));
            input = spec.nextPageInput?.(input, result);
          }
          // An unseeded check only records a baseline; it never carries a window over.
          pending = prior?.seeded === true ? input : undefined;
          return { items };
        },
      });
      const base = { ...(nextState as IdsState), ...(floor === undefined ? {} : { floor }) };
      return {
        events,
        nextState:
          (pending
            ? { ...base, cursor, resume: { checkedAt, input: pending } }
            : { ...base, cursor: checkedAt }) as SinceState,
      };
    },
  };
}

/** "New <record>" over a small bounded collection: diff the ids against the previous check. */
export async function newRecords(o: {
  state: unknown;
  items: unknown[];
  idOf(item: unknown): unknown;
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, unknown>();
  for (const item of o.items) {
    const id = o.idOf(item);
    if (typeof id !== "string" || id === "") {
      throw new Error("Quo list returned a record without an id");
    }
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}

/** Pages read for a snapshot of a bounded list (100 rows each; the kit caps a snapshot at 5000). */
const SNAPSHOT_PAGES = 50;

/** Reads a whole small list through the app's OWN list action, following `nextPageToken`. */
export async function readAllPages(
  action: ActionDefinition,
  ctx: Parameters<ActionDefinition["execute"]>[1],
): Promise<unknown[]> {
  const all: unknown[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < SNAPSHOT_PAGES; page++) {
    const res = await action.execute(
      { maxResults: 100, ...(pageToken ? { pageToken } : {}) },
      ctx,
    ) as { data?: unknown[]; nextPageToken?: string | null };
    all.push(...(res.data ?? []));
    if (!res.nextPageToken) return all;
    pageToken = res.nextPageToken;
  }
  throw new Error(`Quo list is longer than ${SNAPSHOT_PAGES} pages; refusing to snapshot it`);
}
