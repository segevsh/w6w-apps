import type { HookContext } from "@w6w/types";
import labelRequestList from "../actions/label-request-list.ts";
import returnList from "../actions/return-list.ts";
import { pollWindow } from "./window.ts";

/** Test seam: the trigger reads the time through this object. */
export const clock = { now: (): number => Date.now() };

const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
/** Loop refuses a `from`..`to` range longer than 120 days (422), so a stale cursor is clamped. */
const MAX_RANGE_MS = 119 * 24 * 3_600_000;

type Rec = { id?: unknown; created_at?: unknown; updated_at?: unknown };

const msOf = (value: unknown): number | undefined => {
  const ms = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isNaN(ms) ? undefined : ms;
};

/** Loop's `yyyy-mm-dd hh:mm:ss` window format, read as UTC (its own timestamps carry +00:00). */
export const loopTime = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 19).replace("T", " ");

/**
 * Returns created (or updated) since the previous check. `GET /warehouse/return/list` takes a
 * `from`/`to` window and a `filter` choosing which timestamp it applies to
 * (https://docs.loopreturns.com/openapi/returns-api.yaml); no order is documented, so a window that
 * holds more than one page resumes by the response's `nextPageUrl` cursor (brief 9.8).
 */
export function pollReturns(
  filter: "created_at" | "updated_at",
  state: unknown,
  ctx: HookContext,
) {
  const stamp = (r: Rec) =>
    msOf(filter === "updated_at" ? r.updated_at ?? r.created_at : r.created_at);
  return pollWindow<Rec, string>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (r) => filter === "updated_at" ? `${r.id}:${r.updated_at ?? ""}` : String(r.id ?? ""),
    tsOf: stamp,
    async load(since, cursor, until) {
      const res = await returnList.execute({
        from: loopTime(Math.max(since, until - MAX_RANGE_MS)),
        to: loopTime(until),
        filter,
        pageSize: PAGE_SIZE,
        ...(cursor === undefined ? {} : { cursor }),
      }, ctx) as { returns?: Rec[]; nextCursor?: string | null };
      return { items: res.returns ?? [], next: res.nextCursor ?? undefined };
    },
  });
}

/** Label requests created since the previous check (`GET /label-requests`, offset paging). */
export function pollLabelRequests(state: unknown, ctx: HookContext) {
  return pollWindow<Rec, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (r) => String(r.id ?? ""),
    tsOf: (r) => msOf(r.created_at),
    async load(since, offset, until) {
      const res = await labelRequestList.execute({
        from: new Date(since).toISOString(),
        to: new Date(until).toISOString(),
        limit: PAGE_SIZE,
        offset: offset ?? 0,
      }, ctx) as { labelRequests?: Rec[] };
      const items = res.labelRequests ?? [];
      return { items, next: items.length >= PAGE_SIZE ? (offset ?? 0) + PAGE_SIZE : undefined };
    },
  });
}
