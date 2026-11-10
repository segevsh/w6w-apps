import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { TriggerDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";

const PER_PAGE = 200;
/** Highest page the tail search will probe (200 x 1024 contacts). */
const MAX_PAGE = 1024;
/** Ids kept: the newest two pages plus page 1 are re-read every check, so they must all fit. */
const SEEN_WINDOW = 2000;

interface Page {
  items: Record<string, unknown>[];
  more: boolean;
}

/** Zoho times look like `2026-11-09T12:06:10+0530`; make the offset ISO-parseable. */
const stamp = (v: unknown): number =>
  Date.parse(String(v ?? "").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));

/**
 * Contact feed over `contact-list`, independent of the vendor's sort direction. Zoho Invoice documents
 * `sort_column` on List Contacts ("Allowed Values: contact_name, first_name, last_name, email,
 * outstanding_receivable_amount, created_time and last_modified_time") but documents no default
 * direction and no request value for it. So the trigger sorts on the documented column, reads page 1
 * and decides the direction from that page's own timestamps: strictly newest-first means page 1 is
 * all that is needed. Anything else (oldest-first, ties, missing stamps) means the newest contacts
 * may be on the last pages, so it finds the last page (doubling, then bisecting on the documented
 * `has_more_page` / empty page) and reads the last two pages as well as page 1. Ids are de-duplicated
 * by `idOf`, so the order of what is read never matters.
 */
export function contactFeed(o: {
  key: string;
  title: string;
  description: string;
  sortColumn: "created_time" | "last_modified_time";
  idOf(item: Record<string, unknown>): string;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    params: [],
    output: [
      { key: "contact_id", type: "string", label: "Contact ID" },
      { key: "contact_name", type: "string", label: "Contact name" },
      { key: "created_time", type: "string", label: "Created time" },
      { key: "last_modified_time", type: "string", label: "Last modified time" },
    ],
    sample: {
      contact_id: "460000000026049",
      contact_name: "Acme",
      created_time: "2026-11-09T12:06:10+0530",
      last_modified_time: "2026-11-09T18:24:51+0530",
    },
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const cache = new Map<number, Page>();
      const read = async (page: number): Promise<Page> => {
        const hit = cache.get(page);
        if (hit) return hit;
        const res = await contactList.execute({
          page,
          per_page: PER_PAGE,
          sort_column: o.sortColumn,
        }, ctx) as { data?: Record<string, unknown>[]; pageContext?: { has_more_page?: boolean } };
        const got = { items: res.data ?? [], more: res.pageContext?.has_more_page === true };
        cache.set(page, got);
        return got;
      };
      return await pollNewItems<Record<string, unknown>>({
        state,
        idOf: o.idOf,
        maxPages: 1,
        maxEvents: Number.POSITIVE_INFINITY,
        seenWindow: SEEN_WINDOW,
        async fetchPage() {
          const first = await read(1);
          if (!first.more) return { items: first.items };
          const a = stamp(first.items[0]?.[o.sortColumn]);
          const b = stamp(first.items[first.items.length - 1]?.[o.sortColumn]);
          if (a > b) return { items: first.items }; // newest first: page 1 holds the newest
          // find the last page: double while pages exist, then bisect
          let lo = 1;
          let hi = 2;
          while (hi <= MAX_PAGE) {
            const r = await read(hi);
            if (r.items.length === 0) break;
            lo = hi;
            if (!r.more) break;
            hi *= 2;
          }
          if (hi > MAX_PAGE) hi = MAX_PAGE + 1;
          while (hi - lo > 1 && (await read(lo)).more) {
            const mid = lo + Math.floor((hi - lo) / 2);
            if ((await read(mid)).items.length === 0) hi = mid;
            else lo = mid;
          }
          // strictly oldest-first: page 1 holds only the oldest, which never matter
          const items = a < b ? [] : [...first.items];
          if (lo > 2) items.push(...(await read(lo - 1)).items);
          if (lo > 1) items.push(...(await read(lo)).items);
          return { items };
        },
      });
    },
  };
}
