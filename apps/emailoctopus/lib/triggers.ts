import type { HookContext } from "@w6w/types";
import listContacts from "../actions/list-contacts.ts";
import listLists from "../actions/list-lists.ts";
import { pollWindow } from "./window.ts";

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

/**
 * Poll a list's contacts through one documented date filter (`created_at.gte` or
 * `last_updated_at.gte`), following `paging.next.starting_after` for up to five pages per check.
 * A window holding more than that keeps its `starting_after` token in state (`pollWindow`) and
 * continues from it on the next check; the cursor advances only once the window is drained, and
 * nothing is emitted twice (ids are marked seen only when emitted).
 */
export function pollContacts(
  o: {
    state: unknown;
    listId: string;
    filter: "createdAtGte" | "lastUpdatedAtGte";
    idOf(contact: Contact): string;
  },
  ctx: HookContext,
) {
  return pollWindow<Contact, string>({
    state: o.state,
    now: Date.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: 1000,
    idOf: o.idOf,
    async load(since, startingAfter) {
      const out = await listContacts.execute!({
        listId: o.listId,
        [o.filter]: new Date(since).toISOString(),
        limit: PAGE_SIZE,
        startingAfter,
      }, ctx) as Cursor<Contact>;
      return {
        items: Array.isArray(out?.data) ? out.data : [],
        next: out?.paging?.next?.starting_after || undefined,
      };
    },
  });
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
