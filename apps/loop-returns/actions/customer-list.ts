import type { ActionDefinition } from "@w6w/types";
import { cursorOf, LoopClient } from "../lib/client.ts";

/**
 * List Customers.
 *
 * `GET /customers` (Customers scope). Page size is prefilled at 25 (Loop's default is 50, max 250).
 */
interface Input {
  externalId?: string;
  limit?: number;
  sortOrder?: string;
  cursor?: string;
}

const action: ActionDefinition<Input> = {
  key: "customer-list",
  type: "read",
  resource: "customer",
  title: "List Customers",
  description: "List customers held in Loop, cursor-paginated.",
  params: [
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Only the customer with this external id.",
    },
    {
      key: "limit",
      label: "Page size",
      type: "number",
      hint: "Results per page, 1–250 (Loop's maximum). Prefilled at 25; Loop's own default is 50.",
      default: 25,
      validation: { integer: true, min: 1, max: 250 },
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      hint: "Sort direction.",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint:
        "Pass the previous page's `nextCursor` to fetch the next page. Omit for the first page.",
    },
  ],
  output: [
    { key: "customers", type: "array", label: "Customers" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page, null on the last" },
    { key: "nextPageUrl", type: "string", label: "Loop's next-page URL" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).get("/customers", {
      external_id: input.externalId,
      limit: input.limit ?? 25,
      sort_order: input.sortOrder,
      cursor: input.cursor,
    }) as Record<string, unknown>;
    const next = (res.next_page_url ?? null) as string | null;
    return { customers: res.customers ?? [], nextCursor: cursorOf(next), nextPageUrl: next };
  },
};

export default action;
