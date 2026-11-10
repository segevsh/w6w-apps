import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollWindow } from "./window.ts";

/** Test seam: the clock the since-filter triggers read. */
export const clock = { now: (): number => Date.now() };

const PAGE_SIZE = 100;
const MAX_PAGES = 5;
/** Most pages one snapshot check reads (50 x 100 = the kit's 5000-row cap). */
export const MAX_SNAPSHOT_PAGES = 50;

type Execute = (input: Record<string, unknown>, ctx: HookContext) => Promise<unknown>;
interface Page {
  items?: Record<string, unknown>[];
  nextCursor?: string;
}

/** Epoch ms of a Unix-seconds stamp; undefined when absent (such an item is kept). */
export function secondsMs(stamp: unknown): number | undefined {
  return typeof stamp === "number" && Number.isFinite(stamp) ? stamp * 1000 : undefined;
}

export interface SinceSpec<P> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** How far behind the cursor each window starts (re-read and de-duplicated by id). */
  overlapMs: number;
  /**
   * Read one page of the wrapped list action with the vendor's date filter bound to `from`.
   * `pos` is the previous page's position (a page number, or a cursor), undefined for the first.
   */
  load(
    args: { from: number; params: P; pos?: string | number },
    ctx: HookContext,
  ): Promise<{ items: Record<string, unknown>[]; next?: string | number }>;
  idOf(item: Record<string, unknown>): string;
  /** The timestamp (ms) the seed floor compares: the record's own creation or update time. */
  tsOf(item: Record<string, unknown>): number | undefined;
}

/** Brief 9.1(b) since-filter poll on top of `pollWindow` (9.8 resume + 9.9 seed floor). */
export function sinceFilterTrigger<P = Record<string, unknown>>(
  spec: SinceSpec<P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ params, state }, ctx) {
      return pollWindow<Record<string, unknown>, string | number>({
        state,
        now: clock.now(),
        overlapMs: spec.overlapMs,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: 1000,
        idOf: spec.idOf,
        tsOf: spec.tsOf,
        load: (since, pos) => spec.load({ from: since, params, pos }, ctx),
      });
    },
  };
}

/** Page-number loader: asks for `perPage` 100 and stops after a short page. */
export function numbered<P>(
  action: ActionDefinition,
  input: (params: P, from?: number) => Record<string, unknown>,
) {
  return async (args: { from?: number; params: P; pos?: string | number }, ctx: HookContext) => {
    const page = typeof args.pos === "number" ? args.pos : 1;
    const res = await (action.execute as Execute)(
      { ...input(args.params, args.from), page, perPage: PAGE_SIZE },
      ctx,
    ) as Page;
    const items = res.items ?? [];
    return { items, next: items.length >= PAGE_SIZE ? page + 1 : undefined };
  };
}

/** Cursor loader for the two photo endpoints (`after` <- `X-Next-Cursor`; no `page` with it). */
export function cursored<P>(
  action: ActionDefinition,
  input: (params: P, from?: number) => Record<string, unknown>,
) {
  return async (args: { from?: number; params: P; pos?: string | number }, ctx: HookContext) => {
    const after = typeof args.pos === "string" ? args.pos : undefined;
    const res = await (action.execute as Execute)(
      { ...input(args.params, args.from), perPage: PAGE_SIZE, after },
      ctx,
    ) as Page;
    return { items: res.items ?? [], next: res.nextCursor };
  };
}

export interface SnapshotSpec<P> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  action: ActionDefinition;
  /** Action input for these trigger params (page/perPage are added here). */
  input(params: P): Record<string, unknown>;
  /** Also emit a row whose content changed (the "new or updated" sibling). */
  updated?: boolean;
}

/** Brief 9.1(c): the whole bounded collection is read each check (all pages) and diffed by id. */
export function snapshotTrigger<P = Record<string, unknown>>(
  spec: SnapshotSpec<P>,
): TriggerDefinition<P> {
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
      for (let page = 1;; page++) {
        if (page > MAX_SNAPSHOT_PAGES) {
          throw new Error(
            `${spec.key}: more than ${MAX_SNAPSHOT_PAGES} pages; this collection is too large to snapshot`,
          );
        }
        const res = await (spec.action.execute as Execute)(
          { ...spec.input(params), page, perPage: PAGE_SIZE },
          ctx,
        ) as Page;
        const items = res.items ?? [];
        for (const item of items) rows.push({ key: String(item.id ?? ""), values: item });
        if (items.length < PAGE_SIZE) break;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: spec.updated === true },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}
