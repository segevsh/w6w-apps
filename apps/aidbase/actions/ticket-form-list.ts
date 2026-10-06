import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient } from "../lib/client.ts";

/**
 * List Ticket Forms — List the ticket forms in the account.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
// deno-lint-ignore no-empty-interface
interface Input {}

const ticketFormList: ActionDefinition<Input> = {
  key: "ticket-form-list",
  type: "read",
  resource: "ticket-form",
  title: "List Ticket Forms",
  description: "List the ticket forms in the account.",
  params: [],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Ticket Forms",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Number returned",
    },
  ],

  execute(_input, ctx) {
    return new AidbaseClient(ctx).array(`/ticket-forms`);
  },
};

export default ticketFormList;
