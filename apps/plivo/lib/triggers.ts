import type { HookContext } from "@w6w/types";
import { pollWindow } from "./window.ts";

/** Look-back before the stored cursor, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Plivo caps `limit` at 20 on both list endpoints. */
export const PAGE_SIZE = 20;
/** Pages one check reads; a bigger window resumes next check (brief 9.8). */
export const MAX_PAGES = 3;
/** Widest real UTC offset; the filter bound until the account's own offset has been seen. */
const MAX_NEGATIVE_OFFSET_MIN = -14 * 60;

export interface Stamp {
  /** True UTC instant (epoch ms): the wall clock minus the stamp's own offset. */
  utc: number;
  /** The stamp's offset from UTC in minutes (0 when it carries none). */
  offsetMin: number;
}

/** Plivo stamps records as `2022-06-28 19:39:15+05:30` (wall clock plus the account's offset). */
export function parseStamp(stamp: unknown): Stamp | undefined {
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
  return { utc: wall - offsetMin * 60_000, offsetMin };
}

/** `yyyy-MM-dd HH:mm:ss`, the format both filters document. */
export function filterStamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Since-filter polling. The documented filter is a bare `yyyy-MM-dd HH:mm:ss` with no zone, so the
 * bound is the EARLIER of its UTC and account-wall-clock readings (`since + min(0, offset)`), where
 * the offset is learned from the records themselves (`state.offsetMin`); until one is seen it is
 * the widest negative offset. Floor and cursor are true UTC (wall minus the stamp's offset), so
 * the wider bound only costs re-reads, which the floor and the seen ids absorb.
 */
export async function checkSince<T>(o: {
  state: unknown;
  list(since: string, offset: number, ctx: HookContext): Promise<unknown[]>;
  idOf(item: T): string;
  stampOf(item: T): unknown;
  ctx: HookContext;
}): Promise<{ events: T[]; nextState: Record<string, unknown> }> {
  const prior = (o.state as { offsetMin?: unknown } | null)?.offsetMin;
  let offsetMin = typeof prior === "number" ? prior : undefined;
  const res = await pollWindow<T, number>({
    state: o.state,
    now: Date.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 200,
    idOf: o.idOf,
    tsOf: (item) => parseStamp(o.stampOf(item))?.utc,
    async load(since, pos) {
      const bound = since + Math.min(0, offsetMin ?? MAX_NEGATIVE_OFFSET_MIN) * 60_000;
      const offset = pos ?? 0;
      const items = (await o.list(filterStamp(bound), offset, o.ctx)) as T[];
      for (const item of items) {
        const s = parseStamp(o.stampOf(item));
        if (s) offsetMin = s.offsetMin;
      }
      return { items, next: items.length >= PAGE_SIZE ? offset + PAGE_SIZE : undefined };
    },
  });
  return {
    events: res.events,
    nextState: offsetMin === undefined ? res.nextState : { ...res.nextState, offsetMin },
  };
}
