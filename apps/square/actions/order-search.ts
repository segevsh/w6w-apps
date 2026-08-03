import type { ActionDefinition } from "@w6w/types";
import { jsonObject, SquareClient, unset } from "../lib/client.ts";
import { cursor, limit, listOutput } from "../lib/params.ts";

interface Input {
  locationIds?: string;
  states?: string[];
  createdAfter?: string;
  createdBefore?: string;
  sortField?: string;
  sortOrder?: string;
  query?: unknown;
  returnEntries?: boolean;
  limit?: number;
  cursor?: string;
}

/**
 * `POST /v2/orders/search` (SearchOrders).
 *
 * Square publishes **no** `GET /v2/orders` — search IS the list endpoint, and
 * `RetrieveOrder` (`order-get`) is the only other read. That is why this action
 * exists in a pack where every other resource has a plain `*-get-many`.
 *
 * The common filters (state, created-at window, sort) are first-class params
 * that this action assembles into Square's nested `query` object. Anything
 * richer — fulfilment status, source, customer id — is reachable through the
 * `query` JSON param, which is merged over the assembled one so a power user is
 * never boxed in. Nothing is invented: the shapes are Square's own
 * `SearchOrdersQuery` / `SearchOrdersFilter` / `SearchOrdersSort`.
 *
 * Square's own constraint, worth repeating because it is a 400 otherwise: if
 * you filter on `created_at` the sort field must be `CREATED_AT`, and likewise
 * for `updated_at` / `closed_at`.
 */
const orderSearch: ActionDefinition<Input> = {
  key: "order-search",
  type: "search",
  resource: "order",
  title: "Search Orders",
  description:
    "Search orders by location, state and time window. Square has no plain list-orders endpoint; this is it.",
  params: [
    {
      key: "locationIds",
      label: "Location IDs",
      type: "string",
      hint: "Comma-separated, maximum 10. All must belong to the same merchant.",
    },
    {
      key: "states",
      label: "States",
      type: "multiselect",
      options: [
        { value: "OPEN", label: "Open" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELED", label: "Canceled" },
        { value: "DRAFT", label: "Draft" },
      ],
    },
    {
      key: "createdAfter",
      label: "Created after",
      type: "datetime",
      hint: "RFC 3339. Filtering on created-at forces the sort field to CREATED_AT.",
    },
    { key: "createdBefore", label: "Created before", type: "datetime", hint: "RFC 3339." },
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      default: "CREATED_AT",
      options: [
        { value: "CREATED_AT", label: "Created at" },
        { value: "UPDATED_AT", label: "Updated at" },
        { value: "CLOSED_AT", label: "Closed at" },
      ],
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "DESC", label: "Newest first (DESC)" },
        { value: "ASC", label: "Oldest first (ASC)" },
      ],
    },
    {
      key: "returnEntries",
      label: "Return entries only",
      type: "boolean",
      hint:
        "Return lightweight OrderEntry stubs (id, location, version) instead of whole Order objects.",
    },
    {
      key: "query",
      label: "Query (advanced)",
      type: "json",
      hint:
        'A raw Square SearchOrdersQuery, merged over the fields above — e.g. {"filter":{"fulfillment_filter":{"fulfillment_states":["PROPOSED"]}}}.',
    },
    limit("Max results per page. Square's default is 500, maximum 1000."),
    cursor,
  ],
  output: [
    ...listOutput("orders", "Orders (empty when Return entries only is set)"),
    {
      key: "order_entries",
      type: "array",
      label: "Order stubs (only when Return entries only is set)",
    },
  ],

  execute(input, ctx) {
    const locationIds = (input.locationIds ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Assemble Square's nested SearchOrdersQuery from the flat params.
    const filter: Record<string, unknown> = {};
    if (input.states?.length) filter.state_filter = { states: input.states };
    const createdAt = {
      start_at: unset(input.createdAfter),
      end_at: unset(input.createdBefore),
    };
    if (createdAt.start_at || createdAt.end_at) {
      filter.date_time_filter = {
        created_at: Object.fromEntries(
          Object.entries(createdAt).filter(([, v]) => v !== undefined),
        ),
      };
    }

    const query: Record<string, unknown> = {};
    if (Object.keys(filter).length) query.filter = filter;
    if (input.sortField) {
      query.sort = {
        sort_field: input.sortField,
        ...(input.sortOrder ? { sort_order: input.sortOrder } : {}),
      };
    }

    // The advanced JSON param wins, so a caller can express anything Square can.
    const override = jsonObject(input.query, "query");
    const merged = { ...query, ...(override ?? {}) };

    return new SquareClient(ctx).request("/orders/search", {
      body: {
        location_ids: locationIds,
        query: Object.keys(merged).length ? merged : undefined,
        return_entries: input.returnEntries,
        limit: input.limit,
        cursor: unset(input.cursor),
      },
    });
  },
};

export default orderSearch;
