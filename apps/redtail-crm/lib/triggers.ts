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
  action: ActionDefinition;
  pageSize: number;
  input(window: { since: string; until: string }): Record<string, unknown>;
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
    async poll({ state }, ctx) {
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
          });
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

/**
 * A "new <record>" poll over a Redtail list that documents NO sort order and NO created-since
 * filter. Each check walks `page=1…meta.total_pages` of the SAME list action and diffs the ids
 * against the previous check (`pollSnapshot`, added only). A list with more than `maxPages` pages
 * throws an error naming the cap instead of silently missing records. A response without `meta`
 * (the docs' notes example has none) is one page.
 */
export function pagedSnapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  maxPages: number;
  params?: Param[];
  input?(params: Record<string, unknown>): Record<string, unknown>;
  items(result: unknown): unknown[];
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}): TriggerDefinition {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(`pagedSnapshotTrigger(${spec.key}): ${spec.action.key} is not a list action`);
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ params, state }, ctx) {
      const byId = new Map<string, unknown>();
      for (let page = 1;; page++) {
        const result = await spec.action.execute(
          { ...(spec.input?.(params as Record<string, unknown>) ?? {}), page },
          ctx,
        ) as { meta?: { total_pages?: number } };
        for (const item of spec.items(result) as Array<{ id?: unknown }>) {
          if (item.id !== undefined && item.id !== null) byId.set(String(item.id), item);
        }
        const totalPages = Number(result.meta?.total_pages ?? 1);
        if (page >= totalPages) break;
        if (page >= spec.maxPages) {
          throw new Error(
            `${spec.key}: the list has ${totalPages} pages; this trigger reads at most ${spec.maxPages}`,
          );
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        emit: { added: true, updated: false },
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
