import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;

const rowsOf = (r: unknown, key: string): Item[] => {
  const rows = (r as Record<string, unknown> | undefined)?.[key];
  return Array.isArray(rows) ? (rows as Item[]) : [];
};

/** Clock seam. Tests replace `clock.now`; the host hands a trigger no clock. */
export const clock = { now: (): number => Date.now() };

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** The API's largest page (`per_page` max 100) and the pages read per check. */
export const PER_PAGE = 100;
export const MAX_PAGES = 3;
/** Seen ids kept: more than one check can emit (MAX_PAGES x PER_PAGE) plus one overlap re-list. */
export const SEEN_WINDOW = 600;

interface Common {
  key: string;
  title: string;
  description: string;
  action: unknown;
  output: OutputField[];
  sample: unknown;
}

/**
 * Newest-first: the list action's `sort` argument (`-created_at` / `-updated_at` — "to sort in
 * descending order, the sort parameter can be prefixed with a hyphen",
 * https://dev.freeagent.com/docs/invoices). With `updatedKey` the id carries that stamp, so an edit
 * is a new event. `paged` actions also take `page` / `perPage`.
 */
export function newestFirstTrigger(
  spec: Common & { itemsKey: string; sort: string; paged: boolean; updatedKey?: string },
): TriggerDefinition {
  return pollFromListAction({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action as ActionDefinition,
    input: () => spec.paged ? { sort: spec.sort, page: 1, perPage: PER_PAGE } : { sort: spec.sort },
    items: (r) => rowsOf(r, spec.itemsKey),
    idOf: (item) => {
      const it = item as Item;
      const id = String(it.url ?? "");
      return spec.updatedKey ? `${id}:${String(it[spec.updatedKey] ?? "")}` : id;
    },
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}

/** A small unpaged collection (users): diff the ids between checks, additions only. */
export function snapshotTrigger(spec: Common & { itemsKey: string }): TriggerDefinition {
  const action = spec.action as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const byId = new Map<string, Item>();
      for (const it of rowsOf(await action.execute({}, ctx), spec.itemsKey)) {
        const id = String(it.url ?? "");
        if (id) byId.set(id, it);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key) as Item), nextState };
    },
  };
}

/** The since-filter state: seen ids, the cursor, the seed floor and an optional resume position. */
export interface SinceState {
  v: 1;
  kind: "since";
  seeded: true;
  /** Epoch ms at the seed: records created before it are never emitted (no flood). */
  floor: number;
  /** Epoch ms of the last fully drained window. */
  cursor: number;
  seen: string[];
  /** A window with more than MAX_PAGES pages: continue at `page` with the same `since`. */
  resume?: { since: string; page: number; nextCursor: number };
}

const isSince = (s: unknown): s is SinceState =>
  !!s && typeof s === "object" && (s as SinceState).kind === "since" &&
  (s as SinceState).seeded === true && typeof (s as SinceState).cursor === "number" &&
  typeof (s as SinceState).floor === "number" && Array.isArray((s as SinceState).seen);

/**
 * Since-filter: the list action's `updated_since` argument, set to `cursor - overlap`, read
 * MAX_PAGES x PER_PAGE rows per check and deduped by `url`. The seed stores `floor = now` and reads
 * nothing; every later check drops records whose own `created_at` is before the floor. A window
 * longer than MAX_PAGES pages stores a resume position and continues there on the next check; the
 * cursor advances only once the window is drained.
 */
export function sinceTrigger(
  spec: Common & {
    itemsKey: string;
    params?: Param[];
    input(
      params: Record<string, unknown>,
      w: { updatedSince: string; page: number; perPage: number },
    ): Record<string, unknown>;
  },
): TriggerDefinition {
  const action = spec.action as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const now = clock.now();
      if (!isSince(state)) {
        return {
          events: [],
          nextState: { v: 1, kind: "since", seeded: true, floor: now, cursor: now, seen: [] },
        };
      }
      const since = state.resume?.since ?? new Date(state.cursor - OVERLAP_MS).toISOString();
      const nextCursor = state.resume?.nextCursor ?? now;
      let page = state.resume?.page ?? 1;
      const seen = new Set(state.seen);
      const order = [...state.seen];
      const fresh: Item[] = [];
      let drained = false;
      for (let n = 0; n < MAX_PAGES; n++, page++) {
        const res = await action.execute(
          spec.input(params, { updatedSince: since, page, perPage: PER_PAGE }),
          ctx,
        );
        const rows = rowsOf(res, spec.itemsKey);
        for (const it of rows) {
          const id = String(it.url ?? "");
          const created = Date.parse(String(it.created_at ?? ""));
          if (!id || seen.has(id) || created < state.floor) continue;
          seen.add(id);
          order.push(id);
          fresh.push(it);
        }
        if (rows.length < PER_PAGE) {
          drained = true;
          break;
        }
      }
      fresh.sort((a, b) =>
        Date.parse(String(a.created_at ?? "")) - Date.parse(String(b.created_at ?? ""))
      );
      const nextState: SinceState = {
        v: 1,
        kind: "since",
        seeded: true,
        floor: state.floor,
        cursor: drained ? nextCursor : state.cursor,
        seen: order.slice(-SEEN_WINDOW),
        ...(drained ? {} : { resume: { since, page, nextCursor } }),
      };
      return { events: fresh, nextState };
    },
  };
}
