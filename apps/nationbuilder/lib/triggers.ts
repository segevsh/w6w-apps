import type { HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import donationList from "../actions/donation-list.ts";
import { pollWindow } from "./window.ts";

/** Test seam: the triggers read the time through this object. */
export const clock = { now: (): number => Date.now() };

const OVERLAP_MS = 120_000;
export const PAGE_SIZE = 100;
const MAX_PAGES = 5;
/** Rows a snapshot trigger reads per check: 50 pages of 100, the same cap `pollSnapshot` applies. */
export const SNAPSHOT_MAX_ROWS = 5000;

type Rec = Record<string, unknown>;

const msOf = (value: unknown): number | undefined => {
  const ms = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isNaN(ms) ? undefined : ms;
};

/**
 * Donations created (or edited) since the previous check. `GET /api/v2/donations` documents no
 * sort, but it does document `filter[created_at][gte]` / `filter[updated_at][gte]` (date
 * attributes take `gt`/`gte`/`lt`/`lte`, https://nationbuilder.com/api/v2/docs/v2/released.yaml),
 * so the check reads one window and resumes by page number (brief 9.8). Continuation pages also
 * carry an upper bound (`lt` the moment the window started) so arrivals cannot shift a page.
 */
export function pollDonations(
  field: "created_at" | "updated_at",
  state: unknown,
  ctx: HookContext,
) {
  const stamp = (r: Rec) =>
    msOf(field === "updated_at" ? r.updated_at ?? r.created_at : r.created_at);
  return pollWindow<Rec, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 1000,
    idOf: (r) => field === "updated_at" ? `${r.id}:${r.updated_at ?? ""}` : String(r.id ?? ""),
    tsOf: stamp,
    async load(since, page, until) {
      const filter: Rec = { [`${field}][gte`]: new Date(since).toISOString() };
      if (page !== undefined) filter[`${field}][lt`] = new Date(until).toISOString();
      const res = await donationList.execute(
        { filter, pageSize: PAGE_SIZE, pageNumber: page ?? 1 },
        ctx,
      ) as { items?: Rec[] };
      const items = res.items ?? [];
      return { items, next: items.length >= PAGE_SIZE ? (page ?? 1) + 1 : undefined };
    },
  });
}

/**
 * Reads every page of a bounded list action (page-number paging, 100 per page) up to
 * `SNAPSHOT_MAX_ROWS`. A listing that reaches the cap may be truncated, so it throws rather than
 * guess which rows are new.
 */
export async function readAllPages(
  list: (page: number) => Promise<Rec[]>,
  what: string,
): Promise<Rec[]> {
  const rows: Rec[] = [];
  for (let page = 1; rows.length < SNAPSHOT_MAX_ROWS; page++) {
    const items = await list(page);
    rows.push(...items);
    if (items.length < PAGE_SIZE) return rows;
  }
  throw new Error(
    `${what}: the listing reached ${SNAPSHOT_MAX_ROWS} rows, so new ones cannot be told apart reliably`,
  );
}

/** Rows diffed against the previous check (`pollSnapshot`, added only; the first check seeds). */
export async function snapshotAdded(state: unknown, rows: Rec[]) {
  const { events, nextState } = await pollSnapshot({
    state,
    rows: rows.map((r) => ({ key: String(r.id), values: { id: String(r.id) } })),
    emit: { added: true, updated: false },
  });
  const byKey = new Map(rows.map((r) => [String(r.id), r]));
  return { events: events.map((e) => byKey.get(e.key)), nextState };
}
