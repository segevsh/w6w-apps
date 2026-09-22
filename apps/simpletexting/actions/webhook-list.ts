import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /api/webhooks` — "Get all Webhooks".
 *
 * A page of `{webhookId, url, triggers, requestPerSecLimit, accountPhone,
 * contactPhone}` — the account's webhook subscriptions, with the same fields the
 * create and update endpoints accept.
 *
 * Two details matter when reconciling:
 *
 * - The identifier is **`webhookId`** in a fetched row, while create and update
 *   answer `{id}`. Both address the same subscription.
 * - `accountPhone` and `contactPhone` are filters on the *subscription*, not on
 *   the messages it will carry: a webhook can be scoped to one sending number
 *   and/or one contact's phone number, and an unscoped webhook receives events
 *   for the whole account. A workflow that expects every incoming message and
 *   gets a subset has usually found a scoped webhook here.
 */
interface Input {
  page?: number;
  size?: number;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the account's webhook subscriptions.",
  params: paginationParams(),
  output: [
    { key: "content", type: "array", label: "Webhooks" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).page("/api/webhooks", {
      query: { page: input.page, size: input.size },
    });
  },
};

export default webhookList;
