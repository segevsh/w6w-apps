import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

interface Contact {
  id?: unknown;
  email_address?: unknown;
  created_at?: unknown;
}

interface PollState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: string;
}

const overlapMs = 120_000;

function cursorOf(state: unknown, now: string): string {
  if (!state || typeof state !== "object") return now;
  const cursor = (state as { cursor?: unknown }).cursor;
  return typeof cursor === "string" && !Number.isNaN(Date.parse(cursor)) ? cursor : now;
}

const trigger: TriggerDefinition<{ listId: string }> = {
  key: "new-contact",
  title: "New Contact",
  description: "Runs when a contact is created in the selected EmailOctopus list.",
  params: [{ key: "listId", label: "List ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
  ],
  sample: {
    id: "contact_01HZY8YVN2Y2P5Q7Z6P7R2Z3T4",
    email_address: "ada@example.com",
    created_at: "2026-11-09T12:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const now = new Date().toISOString();
    const cursor = cursorOf(state, now);
    const since = new Date(Date.parse(cursor) - overlapMs).toISOString();
    const polled = await pollNewItems<Contact>({
      state,
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 200,
      idOf: (contact) => String(contact.id ?? ""),
      async fetchPage() {
        const page = await listContacts.execute!({
          listId: params.listId,
          createdAtGte: since,
          limit: 100,
        }, ctx) as { data?: Contact[] };
        return { items: Array.isArray(page.data) ? page.data : [] };
      },
    });
    return {
      events: polled.events,
      nextState: { ...polled.nextState, cursor: now } satisfies PollState,
    };
  },
};

export default trigger;
