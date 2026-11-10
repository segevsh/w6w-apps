import type { TriggerDefinition } from "@w6w/types";
import contactsList from "../actions/contacts-list.ts";
import { PAGE_SIZE, pollSinceWindow } from "../lib/triggers.ts";

type Contact = { id?: string; updated_at?: string };

const trigger: TriggerDefinition = {
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each contact added or edited in Teamleader Focus after the trigger was turned on, read through the List Contacts action with its `updated_since` filter.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "2d1fb4a6-6c3f-4a3d-8c8e-1f3f6f5c9a11",
    first_name: "Erica",
    last_name: "Strauss",
    updated_at: "2026-11-09T10:15:00+00:00",
  },
  async poll(input, ctx) {
    return await pollSinceWindow<Contact>({
      state: input.state,
      async fetchPage(sinceMs, page) {
        const res = await contactsList.execute({
          updatedSince: new Date(sinceMs).toISOString(),
          pageSize: PAGE_SIZE,
          pageNumber: page,
        }, ctx) as { items?: Contact[] };
        return res.items ?? [];
      },
      idOf: (c) => `${c.id ?? ""}:${c.updated_at ?? ""}`,
      timestampOf: (c) => c.updated_at,
    });
  },
};

export default trigger;
