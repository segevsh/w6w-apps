import type { HookContext } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";
import listLists from "../actions/list-lists.ts";

export interface Contact {
  id?: unknown;
  email_address?: unknown;
  created_at?: unknown;
  last_updated_at?: unknown;
}

const OVERLAP_MS = 120_000;
/** EmailOctopus pages hold at most 100 contacts; five pages bound one check at 500 contacts. */
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const MAX_LIST_PAGES = 10;

interface Cursor<T> {
  data?: T[];
  paging?: { next?: { starting_after?: string } };
}

function cursorOf(state: unknown, now: string): string {
  if (!state || typeof state !== "object") return now;
  const cursor = (state as { cursor?: unknown }).cursor;
  return typeof cursor === "string" && !Number.isNaN(Date.parse(cursor)) ? cursor : now;
}

/**
 * Poll a list's contacts through one documented date filter (`created_at.gte` or
 * `last_updated_at.gte`), following `paging.next.starting_after` for up to five pages inside ONE
 * fetch so a burst larger than a page is not lost to the kit's stop-at-first-seen-page rule.
 *
 * The cursor normally advances to "now". When the five pages did not exhaust the result (a burst of
 * more than 500 inside one interval) it advances only to the newest `stamp` actually fetched, so the
 * remainder is requested again next check instead of being skipped. EmailOctopus documents no sort
 * order for this endpoint, so that is the best bound that never jumps past an unfetched window.
 */
export async function pollContacts(
  o: {
    state: unknown;
    listId: string;
    filter: "createdAtGte" | "lastUpdatedAtGte";
    stamp: "created_at" | "last_updated_at";
    idOf(contact: Contact): string;
  },
  ctx: HookContext,
) {
  const now = new Date(Date.now()).toISOString();
  const since = new Date(Date.parse(cursorOf(o.state, now)) - OVERLAP_MS).toISOString();
  let truncated = false;
  let newest = 0;
  const polled = await pollNewItems<Contact>({
    state: o.state,
    maxPages: 1,
    maxEvents: PAGE_SIZE * MAX_PAGES,
    seenWindow: 1000,
    idOf: o.idOf,
    async fetchPage() {
      const items: Contact[] = [];
      let startingAfter: string | undefined;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const out = await listContacts.execute!({
          listId: o.listId,
          [o.filter]: since,
          limit: PAGE_SIZE,
          startingAfter,
        }, ctx) as Cursor<Contact>;
        const data = Array.isArray(out?.data) ? out.data : [];
        items.push(...data);
        for (const contact of data) {
          const at = Date.parse(String(contact[o.stamp] ?? ""));
          if (Number.isFinite(at)) newest = Math.max(newest, at);
        }
        startingAfter = out?.paging?.next?.starting_after;
        if (!startingAfter || data.length === 0) break;
        if (page === MAX_PAGES) truncated = true;
      }
      return { items };
    },
  });
  const cursor = truncated && newest > 0 ? new Date(newest).toISOString() : now;
  return { events: polled.events, nextState: { ...polled.nextState, cursor } };
}

/** Every list of the account, following the cursor; throws instead of silently dropping the tail. */
export async function allLists(ctx: HookContext): Promise<unknown[]> {
  const rows: unknown[] = [];
  let startingAfter: string | undefined;
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const out = await listLists.execute!({ limit: PAGE_SIZE, startingAfter }, ctx) as Cursor<
      unknown
    >;
    rows.push(...(Array.isArray(out?.data) ? out.data : []));
    startingAfter = out?.paging?.next?.starting_after;
    if (!startingAfter) return rows;
  }
  throw new Error(
    `EmailOctopus account has more than ${
      MAX_LIST_PAGES * PAGE_SIZE
    } lists; the New List trigger is capped there`,
  );
}
