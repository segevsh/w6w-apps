import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import contactsList from "../actions/contacts-list.ts";
import { pollWindow, toMs } from "./window.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Per-check ceiling: 5 pages of 100. */
export const MAX_PAGES = 5;
export const PAGE_SIZE = 100;
/** At least MAX_PAGES * PAGE_SIZE + one page, so an overlap re-list never evicts an id emitted last check. */
export const SEEN_WINDOW = 600;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Contact {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

const OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Contact ID" },
  { key: "firstName", type: "string", label: "First name" },
  { key: "lastName", type: "string", label: "Last name" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

/**
 * `POST /crm/v1/contacts/get-list` documents `from` (created on or after) and `updateFrom` (updated on
 * or after) as DATES (day granularity) and no sort order
 * (https://api.sendpulse.com/.well-known/openapi/crm.yaml, `ContactSearchRequest`). The window is
 * therefore requested by day and narrowed client-side to the exact instant; a window longer than
 * `MAX_PAGES` pages is resumed from the persisted offset and the cursor moves only once it drains
 * (brief 9.8); the seed stores `floor = now` and later checks drop contacts stamped before it (9.9).
 */
function check(mode: "new" | "updated", state: unknown, ctx: HookContext) {
  const stamp = (c: Contact) => mode === "new" ? c.createdAt : c.updatedAt;
  return pollWindow<Contact, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    seedRead: false,
    idOf: (c) => mode === "new" ? String(c.id) : `${c.id}:${c.updatedAt ?? ""}`,
    tsOf: (c) => toMs(stamp(c)),
    async load(sinceMs, pos) {
      const offset = pos ?? 0;
      const day = new Date(sinceMs).toISOString().slice(0, 10);
      const res = await contactsList.execute({
        limit: PAGE_SIZE,
        offset,
        ...(mode === "new" ? { from: day } : { updateFrom: day }),
      }, ctx) as { data?: { list?: Contact[]; total?: number } };
      const list = res.data?.list ?? [];
      const total = res.data?.total ?? 0;
      return {
        items: list.filter((c) => (toMs(stamp(c)) ?? sinceMs) >= sinceMs),
        next: offset + PAGE_SIZE < total ? offset + PAGE_SIZE : undefined,
        read: list.length,
      };
    },
  });
}

const SAMPLE = {
  id: 700101,
  firstName: "Anna",
  lastName: "Smith",
  createdAt: "2026-11-09T09:00:00.000Z",
};

export const newContactTrigger: TriggerDefinition = {
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each CRM contact newly created in the account.",
  output: OUTPUT,
  sample: { ...SAMPLE, updatedAt: "2026-11-09T09:00:00.000Z" },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => check("new", state, ctx),
};

export const newOrUpdatedContactTrigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each CRM contact that is created or edited.",
  output: OUTPUT,
  sample: { ...SAMPLE, updatedAt: "2026-11-09T11:30:00.000Z" },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => check("updated", state, ctx),
};
