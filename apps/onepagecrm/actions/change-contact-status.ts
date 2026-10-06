import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  statusId: string;
}

/** `PUT /contacts/{contact_id}/change_status/{status_id}` — the status must be one of the account's statuses. */
const changeContactStatus: ActionDefinition<Input> = {
  key: "change-contact-status",
  type: "perform",
  resource: "contact",
  title: "Change Contact Status",
  description: "Set a contact's status (lead, prospect, customer, or a custom status).",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "statusId",
      label: "Status ID",
      type: "string",
      required: true,
      hint: "From List Statuses.",
    },
  ],
  output: [{ key: "contact", type: "object", label: "The updated contact" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data(
      `/contacts/${encodeId(input.contactId)}/change_status/${encodeId(input.statusId)}`,
      { method: "PUT" },
    );
  },
};

export default changeContactStatus;
