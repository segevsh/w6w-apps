import type { TriggerDefinition } from "@w6w/types";
import { pollContacts } from "../lib/triggers.ts";

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
  poll({ params, state }, ctx) {
    return pollContacts({
      state,
      listId: params.listId,
      filter: "createdAtGte",
      idOf: (contact) => String(contact.id ?? ""),
    }, ctx);
  },
};

export default trigger;
