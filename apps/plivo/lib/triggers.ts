import type { HookContext } from "@w6w/types";
import { type IdsState, pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the stored cursor, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Plivo caps `limit` at 20 on both list endpoints. */
export const PAGE_SIZE = 20;
export const MAX_PAGES = 3;

export interface SinceState extends IdsState {
  /** Latest record time seen, epoch ms, in the earlier of the two readings of Plivo's stamp. */
  cursor?: number;
}

/**
 * Plivo stamps records as `2022-06-28 19:39:15+05:30` but documents the filter as a bare
 * `yyyy-MM-dd HH:mm:ss`, without saying which zone it is read in. Take the EARLIER of the wall-clock
 * and the UTC reading so the filter never starts after a record; ids dedupe the extra overlap.
 */
export function stampMs(stamp: unknown): number | undefined {
  if (typeof stamp !== "string") return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/
    .exec(stamp.trim());
  if (!m) return undefined;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  let offsetMin = 0;
  const z = m[7];
  if (z && z !== "Z") {
    const sign = z[0] === "-" ? -1 : 1;
    const digits = z.slice(1).replace(":", "");
    offsetMin = sign * (+digits.slice(0, 2) * 60 + +digits.slice(2, 4));
  }
  return Math.min(wall, wall - offsetMin * 60_000);
}

/** `yyyy-MM-dd HH:mm:ss`, the format both filters document. */
export function filterStamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

export async function checkSince<T>(o: {
  state: unknown;
  list(since: string | undefined, offset: number, ctx: HookContext): Promise<unknown[]>;
  idOf(item: T): string;
  stampOf(item: T): unknown;
  ctx: HookContext;
}): Promise<{ events: T[]; nextState: SinceState }> {
  const prior = (o.state as { cursor?: unknown } | null)?.cursor;
  const since = typeof prior === "number" ? filterStamp(prior - OVERLAP_MS) : undefined;
  let cursor = typeof prior === "number" ? prior : undefined;
  const { events, nextState } = await pollNewItems<T>({
    state: o.state,
    maxPages: MAX_PAGES,
    maxEvents: 100,
    seenWindow: 200,
    idOf: o.idOf,
    async fetchPage(token) {
      const page = token ? Number(token) : 0;
      const items = (await o.list(since, page * PAGE_SIZE, o.ctx)) as T[];
      for (const item of items) {
        const t = stampMs(o.stampOf(item));
        if (t !== undefined && (cursor === undefined || t > cursor)) cursor = t;
      }
      return { items, nextPageToken: items.length >= PAGE_SIZE ? String(page + 1) : undefined };
    },
  });
  return { events, nextState: cursor === undefined ? nextState : { ...nextState, cursor } };
}
