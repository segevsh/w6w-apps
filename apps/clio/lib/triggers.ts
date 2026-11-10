import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "./window.ts";
import contactList from "../actions/contact-list.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Per-check ceiling: 5 pages of 100. */
export const MAX_PAGES = 5;
export const MAX_EVENTS = 500;
/** At least MAX_EVENTS + one page, so an overlap re-list never evicts an id emitted last check. */
export const SEEN_WINDOW = 500 + 100;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface Contact {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export const CONTACT_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Contact ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "type", type: "string", label: "Person or Company" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

const FIELDS = "id,etag,name,type,primary_email_address,primary_phone_number,created_at,updated_at";

/**
 * `GET /contacts.json` with `created_since` / `updated_since`, listed by `id(asc)`. A window longer
 * than `MAX_PAGES` pages is resumed from the persisted page token on the next check and the cursor
 * moves only once it drains (brief 9.8); the seed stores `floor = now` and later checks drop
 * contacts stamped before it (brief 9.9).
 */
function check(mode: "new" | "updated", state: unknown, ctx: HookContext) {
  return pollWindow<Contact, string>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: 100,
    seenWindow: SEEN_WINDOW,
    idOf: (r) => (mode === "new" ? String(r.id) : `${r.id}:${r.updated_at}`),
    tsOf: (r) => toMs(mode === "new" ? r.created_at : r.updated_at),
    async load(sinceMs, pageToken) {
      const since = new Date(sinceMs).toISOString();
      const res = await contactList.execute({
        ...(mode === "new" ? { createdSince: since } : { updatedSince: since }),
        fields: FIELDS,
        limit: 100,
        pageToken,
      }, ctx) as { items?: Contact[]; nextPageToken?: string };
      return { items: res.items ?? [], next: res.nextPageToken };
    },
  });
}

export const newTrigger: TriggerDefinition = {
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created Clio contact (person or company).",
  output: CONTACT_OUTPUT,
  sample: {
    id: 1,
    name: "Ada Lovelace",
    type: "Person",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T09:00:00Z",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check("new", state, ctx);
  },
};

export const updatedTrigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each Clio contact that is created or edited.",
  output: CONTACT_OUTPUT,
  sample: {
    id: 1,
    name: "Ada Lovelace",
    type: "Person",
    created_at: "2026-11-09T09:00:00Z",
    updated_at: "2026-11-09T11:00:00Z",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check("updated", state, ctx);
  },
};
