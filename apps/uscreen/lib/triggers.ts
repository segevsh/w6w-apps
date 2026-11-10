import type { ActionDefinition, HookContext, Param, TriggerDefinition } from "@w6w/types";
import { pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";

/** Re-read this much before the saved cursor, so clock skew and in-flight rows are not lost. */
const OVERLAP_MS = 120_000;
/** Larger than any single Uscreen page, so one page never needs to be split across checks. */
const MAX_EVENTS = 1000;

export const clock = { now: (): number => Date.now() };

interface Resume {
  since: string;
  page: number;
  startedAt: string;
}
interface State {
  cursor?: string;
  /** Creation instants before this (ms) predate the seed and are never emitted. */
  floor?: number;
  resume?: Resume;
}

export interface SinceSpec {
  key: string;
  title: string;
  description: string;
  /** User-chosen parent (a group id, a customer): required `params` the fetch reads. */
  params?: Param[];
  output: TriggerDefinition["output"];
  sample: unknown;
  idOf(item: unknown): string;
  /** The item's own creation instant in ms; undefined keeps the item. */
  createdMs(item: unknown): number | undefined;
  /** One page of the wrapped list action for the window starting at `since`. */
  fetchPage(
    since: string,
    page: number,
    ctx: HookContext,
    params: Record<string, unknown>,
  ): Promise<{ items: unknown[]; next?: number }>;
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Uscreen stamps `created_at` as unix seconds; tolerate an ISO string too. */
export function stampMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e11 ? value * 1000 : value;
  }
  if (typeof value === "string" && value !== "") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : undefined;
  }
  return undefined;
}

async function check(
  spec: SinceSpec,
  state: unknown,
  ctx: HookContext,
  params: Record<string, unknown>,
) {
  const s = (state ?? {}) as State;
  const nowMs = clock.now();
  const seeded = typeof s.cursor === "string" && Number.isFinite(Date.parse(s.cursor));
  const resume = seeded && s.resume && typeof s.resume.since === "string" ? s.resume : undefined;
  const since = resume?.since ?? iso((seeded ? Date.parse(s.cursor!) : nowMs) - OVERLAP_MS);
  const floor = typeof s.floor === "number" ? s.floor : seeded ? undefined : nowMs;
  const startedAt = resume?.startedAt ?? iso(nowMs);
  const page = resume?.page ?? 1;
  let next: number | undefined;
  const result = await pollNewItems<unknown>({
    state: seeded ? state : undefined,
    maxPages: 1,
    maxEvents: MAX_EVENTS,
    seenWindow: 2000,
    idOf: spec.idOf,
    async fetchPage() {
      const out = await spec.fetchPage(since, page, ctx, params);
      next = out.next;
      return {
        items: out.items.filter((item) => {
          const t = spec.createdMs(item);
          return floor === undefined || t === undefined || t >= floor;
        }),
      };
    },
  });
  if (!seeded) {
    return { events: [], nextState: { ...result.nextState, cursor: startedAt, floor } };
  }
  // A truncated page is read again; otherwise move on. The cursor advances only once drained.
  const more = result.events.length >= MAX_EVENTS ? page : next;
  return {
    events: result.events,
    nextState: more !== undefined
      ? { ...result.nextState, cursor: s.cursor, floor, resume: { since, page: more, startedAt } }
      : { ...result.nextState, cursor: startedAt, floor },
  };
}

export function sinceTrigger(spec: SinceSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll: ({ params, state }, ctx) => check(spec, state, ctx, (params ?? {}) as never),
  };
}

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** Whether the wrapped action takes a `page` argument (the playlist-item list does not). */
  paged: boolean;
  output: TriggerDefinition["output"];
  sample: unknown;
}

/** Pages read per check; a larger collection fails loudly instead of truncating. */
const MAX_SNAPSHOT_PAGES = 20;

/**
 * Shape (c): a small bounded collection (the store's offers, one content item's playlist). Every
 * check reads the whole list (`hasMore`/`nextPage` from the `Link` header) and `pollSnapshot` emits
 * the ids not seen before; the seed stores hashes and emits nothing.
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const rows: Array<{ key: string; values: unknown }> = [];
      let page: number | undefined = 1;
      for (let n = 0; page !== undefined; n++) {
        if (n >= MAX_SNAPSHOT_PAGES) {
          throw new Error(
            `${spec.key}: more than ${MAX_SNAPSHOT_PAGES} pages; refusing to truncate`,
          );
        }
        const out = await (spec.action.execute as (i: unknown, c: HookContext) => Promise<{
          items?: unknown[];
          hasMore?: boolean;
          nextPage?: number | null;
        }>)(spec.paged ? { ...params, page } : { ...params }, ctx);
        for (const item of out.items ?? []) {
          const id = String((item as { id?: unknown }).id ?? "");
          if (id) rows.push({ key: id, values: item });
        }
        page = spec.paged && out.hasMore && typeof out.nextPage === "number"
          ? out.nextPage
          : undefined;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
