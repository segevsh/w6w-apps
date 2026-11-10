import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollWindow } from "./window.ts";

/**
 * Brief 9.1(b) since-filter poll: every check calls the wrapped list action with the vendor's
 * created/updated-after filter set to `cursor - overlap`, then de-duplicates by id. The first
 * check reads nothing and floors at `now` (brief 9.9); a window of more than MAX_PAGES pages
 * resumes by page cursor next check (brief 9.8).
 */
export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 600_000;
const MAX_PAGES = 5;
const PAGE_SIZE = 100;

export interface SinceSpec<T, P> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** Calls the wrapped list action with the filter bound; `page` is the previous page's token. */
  load(
    args: { from: string; params: P; page?: string },
    ctx: HookContext,
  ): Promise<{ items: T[]; next?: string }>;
  idOf(item: T): string;
  /** Drop items the filter returns but this trigger must not emit (e.g. edited, not created). */
  keep?(item: T, from: string): boolean;
  /** Creation/update time (ms) the filter compares; drives the seed floor (brief 9.9). */
  tsOf(item: T): number | undefined;
}

export function sinceFilterTrigger<T, P = Record<string, unknown>>(
  spec: SinceSpec<T, P>,
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
      return pollWindow<T, string>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: 1000,
        idOf: spec.idOf,
        tsOf: spec.tsOf,
        // No upper bound on the filter: an arrival while the window drains can only push records
        // to a LATER page (a re-read, deduped by the seen ids), never skip one.
        async load(since, page) {
          const from = new Date(since).toISOString();
          const res = await spec.load({ from, params, page }, ctx);
          return {
            items: spec.keep ? res.items.filter((i) => spec.keep!(i, from)) : res.items,
            next: res.next,
          };
        },
      });
    },
  };
}

export interface Note {
  id?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Page loader for the `note-list` action with one of its date filters bound to the window. */
export function notesSince(action: ActionDefinition, filter: "createdFrom" | "updatedFrom") {
  return async (
    { from, page }: { from: string; params: unknown; page?: string },
    ctx: HookContext,
  ): Promise<{ items: Note[]; next?: string }> => {
    const res = await action.execute({ [filter]: from, pageCursor: page }, ctx) as {
      items?: Note[];
      nextPageCursor?: string;
    };
    return { items: res.items ?? [], next: res.nextPageCursor };
  };
}

/** Epoch ms of an ISO stamp; undefined when absent or unparseable (such an item is kept). */
export function stampMs(stamp: unknown): number | undefined {
  const t = typeof stamp === "string" ? Date.parse(stamp) : NaN;
  return Number.isNaN(t) ? undefined : t;
}
