import type { ActionDefinition } from "@w6w/types";
import { FrontClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /company/statuses` — verified against Front's own OpenAPI document
 * (`list-company-ticket-statuses`).
 *
 * **Only companies with ticketing enabled have these.** Front's default model
 * has four stored statuses (assigned, unassigned, archived, trashed); turning
 * ticketing on adds a named layer above them — "Open", "Waiting on customer",
 * "Resolved" — each with its own `sts_…` id and a category.
 *
 * That layer is what `conversation-update`'s **Ticket Status ID** and
 * `conversation-snooze`'s **Waiting Status ID** take, and this is the only way
 * to learn the ids. On a company without ticketing the list comes back empty,
 * which is the answer rather than an error.
 */
const action: ActionDefinition = {
  key: "status-list",
  type: "read",
  resource: "status",
  title: "List ticket statuses",
  description:
    "Named ticket statuses and their ids, for companies with ticketing enabled. Empty when it " +
    "is not — which is an answer, not a failure.",
  params: [...LIST_PARAMS],
  output: [
    { key: "id", type: "string", label: "Status ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "category", type: "string", label: "Category" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new FrontClient(ctx).requestAll(
      "/company/statuses",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
