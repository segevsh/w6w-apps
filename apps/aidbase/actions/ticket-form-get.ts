import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Get Ticket Form — Fetch one ticket form.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  ticketFormId: string;
}

const ticketFormGet: ActionDefinition<Input> = {
  key: "ticket-form-get",
  type: "read",
  resource: "ticket-form",
  title: "Get Ticket Form",
  description: "Fetch one ticket form.",
  params: [
    {
      "key": "ticketFormId",
      "label": "Ticket Form ID",
      "type": "string",
      "required": true,
      "hint":
        "The form's public ID (`public_id` from List Ticket Forms), as used in Aidbase's examples.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Form ID",
    },
    {
      "key": "public_id",
      "type": "string",
      "label": "Public ID",
    },
    {
      "key": "title",
      "type": "string",
      "label": "Title",
    },
    {
      "key": "allowed_domains",
      "type": "array",
      "label": "Allowed domains",
    },
    {
      "key": "fields",
      "type": "array",
      "label": "Form fields",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/ticket-form/${encodeId(input.ticketFormId)}`);
  },
};

export default ticketFormGet;
