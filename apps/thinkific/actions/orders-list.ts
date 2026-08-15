import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { type PaginationInput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input extends PaginationInput {}

/**
 * `GET /orders` — list Orders. Read-only, no query filters beyond pagination
 * (the OpenAPI document declares none).
 *
 * `amount_dollars` on the returned `OrderResponse` is documented as a
 * **string** (`"20.0"`), while the same money field on a nested order `Item`
 * is documented as a **number** (`20`) — a real inconsistency in the vendor's
 * own schema, not a transcription slip here. Parse `amount_dollars`
 * defensively rather than assuming either type.
 */
const ordersList: ActionDefinition<Input> = {
  key: "orders-list",
  type: "read",
  resource: "orders",
  title: "List Orders",
  description: "Retrieve a paginated list of Orders on this Site.",
  params: paginationParams(),
  output: [
    { key: "items", type: "array", label: "Orders" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).list("/orders", { query: paginationQuery(input) });
  },
};

export default ordersList;
