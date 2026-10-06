import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, EzTextingClient } from "../lib/client.ts";
import { statusOutput } from "../lib/params.ts";

/** `POST /v1/contacts/batch` — create or update many contacts in one call (answers `200`, no body). */
interface Input {
  contacts: Array<Record<string, unknown>> | string;
  groupIdsAdd?: string[] | string;
  groupIdsRemove?: string[] | string;
}

const contactBatchUpsert: ActionDefinition<Input> = {
  key: "contact-batch-upsert",
  type: "perform",
  resource: "contact",
  title: "Create or Update Contacts (Batch)",
  description: "Create or update a batch of contacts, optionally adding them all to groups.",
  idempotent: true,
  params: [
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      required: true,
      hint:
        'Array of {phoneNumber, firstName, lastName, email, note, custom1..custom5, values}, e.g. [{"phoneNumber":"2125551234","firstName":"Ada"}].',
    },
    { key: "groupIdsAdd", label: "Add to group IDs", type: "array", item: { type: "string" } },
    {
      key: "groupIdsRemove",
      label: "Remove from group IDs",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
  ],
  output: [{ key: "count", type: "number", label: "Contacts submitted" }, ...statusOutput],

  async execute(input, ctx) {
    const contacts = typeof input.contacts === "string"
      ? JSON.parse(input.contacts)
      : input.contacts;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      throw new Error("contacts must be a non-empty array");
    }
    const status = await new EzTextingClient(ctx).status("/contacts/batch", {
      method: "POST",
      body: compact({
        contacts,
        groupIdsAdd: asStringArray(input.groupIdsAdd),
        groupIdsRemove: asStringArray(input.groupIdsRemove),
      }),
    });
    return { count: contacts.length, status };
  },
};

export default contactBatchUpsert;
