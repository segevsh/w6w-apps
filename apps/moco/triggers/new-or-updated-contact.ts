import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { TriggerDefinition } from "@w6w/types";
import contactList from "../actions/contact-list.ts";

/** Look-back before the previous check, so a contact saved late is still seen. */
export const OVERLAP_MS = 120_000;
const PER_PAGE = 100;
const MAX_PAGES = 3;

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
 * is a new event. The first check only records the cursor.
 */
const trigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each MOCO contact created or updated since the last check.",
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101, updated_at: "2026-11-09T12:00:00Z" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const s = state as { v?: number; kind?: string; seeded?: boolean; cursor?: unknown };
    const checkedAt = clock.now();
    if (!(s?.v === 1 && s.kind === "ids" && s.seeded === true && typeof s.cursor === "number")) {
      return {
        events: [],
        nextState: { v: 1, kind: "ids", seeded: true, ids: [], cursor: checkedAt },
      };
    }
    const since = new Date(s.cursor - OVERLAP_MS).toISOString();
    const { events, nextState } = await pollNewItems<Contact>({
      state,
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 400,
      idOf,
      async fetchPage() {
        const items: Contact[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const result = await contactList.execute(
            { page, perPage: PER_PAGE, updatedAfter: since },
            ctx,
          ) as { contacts?: Contact[] };
          const got = result.contacts ?? [];
          items.push(...got);
          if (got.length < PER_PAGE) break;
        }
        return { items };
      },
    });
    return { events, nextState: { ...nextState, cursor: checkedAt } };
  },
};

export default trigger;
