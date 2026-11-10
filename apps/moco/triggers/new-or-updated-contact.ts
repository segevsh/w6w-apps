import { pollWindow } from "../lib/window.ts";
import type { TriggerDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";

/** Look-back before the previous check, so a contact saved late is still seen. */
export const OVERLAP_MS = 120_000;
const PER_PAGE = 100;
/** Pages one check reads; a bigger window resumes next check. */
const MAX_PAGES = 5;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Contact {
  id?: unknown;
  updated_at?: unknown;
}

const idOf = (c: Contact) => `${String(c.id ?? "")}:${String(c.updated_at ?? "")}`;

/**
 * Shape (b) since-filter: calls the SAME `contact-list` action with
 * `updatedAfter = cursor - overlap` (MOCO documents `updated_after`: contacts created or updated
 * after the time, https://docs.mocoapp.com/api/docs/v1.yaml). Ids are `id:updated_at`, so an edit
 * is a new event. The first check reads nothing and floors at `now` (brief 9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each MOCO contact created or updated since the last check.",
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101, updated_at: "2026-11-09T12:00:00Z" },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Contact, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PER_PAGE,
      seenWindow: 1000,
      idOf,
      tsOf: (c) => {
        const ms = Date.parse(String(c.updated_at ?? ""));
        return Number.isNaN(ms) ? undefined : ms;
      },
      // `updated_after` has no upper bound: an arrival while the window drains can only push
      // records to a LATER page (a re-read, deduped by the seen ids), never skip one.
      async load(since, page) {
        const result = await contactList.execute(
          { page: page ?? 1, perPage: PER_PAGE, updatedAfter: new Date(since).toISOString() },
          ctx,
        ) as { contacts?: Contact[] };
        const items = result.contacts ?? [];
        // The vendor documents no order; hand the kit newest-updated-first.
        items.sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
        return { items, next: items.length >= PER_PAGE ? (page ?? 1) + 1 : undefined };
      },
    });
  },
};

export default trigger;
