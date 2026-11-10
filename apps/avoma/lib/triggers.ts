import { pollWindow, toMs } from "./window.ts";
import callList from "../actions/call-list.ts";
import type { HookContext } from "@w6w/types";

/** Overlap re-read on every check: a call is only listed once it has synced, after it started. */
export const OVERLAP_MS = 3_600_000;
/** Pages one check reads; the rest of a longer window is resumed on the next check (brief 9.8). */
export const MAX_PAGES = 3;
/** Avoma documents no `page_size` for `/v1/calls/`; its default page holds 10. */
export const PAGE_SIZE = 10;
const SEEN_WINDOW = 500;

export const clock = { now: (): number => Date.now() };

type Call = Record<string, unknown>;

const idOf = (call: Call): string => {
  if (call.external_id === undefined || call.external_id === null || call.external_id === "") {
    throw new Error("Avoma call has no external_id");
  }
  return String(call.external_id);
};

/**
 * `GET /v1/calls/` with `from_date = cursor - overlap` and `to_date = now`, following `next` for at
 * most {@link MAX_PAGES} pages per check and resuming a longer window on the next check
 * (brief 9.1 b, 9.8, 9.9). Avoma documents no sort order for calls, so no newest-first read is used.
 */
export function pollCalls(
  state: unknown,
  params: Record<string, unknown>,
  ctx: HookContext,
) {
  const now = clock.now();
  return pollWindow<Call, string>({
    state,
    now,
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf,
    tsOf: (call) => toMs(call.start_at),
    async load(sinceMs, next) {
      const page = await callList.execute(
        next ? { next } : {
          fromDate: new Date(sinceMs).toISOString(),
          toDate: new Date(now).toISOString(),
          direction: params.direction as string | undefined,
        },
        ctx,
      );
      const { results, next: nextUrl } = page as { results?: Call[]; next?: string | null };
      return { items: results ?? [], next: nextUrl ?? undefined };
    },
  });
}
