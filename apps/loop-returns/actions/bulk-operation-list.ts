import type { ActionDefinition } from "@w6w/types";
import { cursorOf, LoopClient } from "../lib/client.ts";

/**
 * List Bulk Operations.
 *
 * `GET /bulk-operations` (Bulk Operations (Read) scope). Page size is prefilled at 25.
 */
interface Input {
  limit?: number;
  sortOrder?: string;
  cursor?: string;
}

const action: ActionDefinition<Input> = {
  key: "bulk-operation-list",
  type: "read",
  resource: "bulk-operation",
  title: "List Bulk Operations",
  description:
    "List bulk operations (file imports of orders, products and more), cursor-paginated.",
  params: [
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
    {
      key: "bulk_operations",
      type: "array",
      label: "Bulk operations: id, status, pending/failed/success counts",
    },
    { key: "nextCursor", type: "string", label: "Cursor for the next page, null on the last" },
    { key: "nextPageUrl", type: "string", label: "Loop's next-page URL" },
  ],

  async execute(input, ctx) {
    const res = await new LoopClient(ctx).get("/bulk-operations", {
      limit: input.limit ?? 25,
      sort_order: input.sortOrder,
      cursor: input.cursor,
    }) as Record<string, unknown>;
    const next = (res.next_page_url ?? null) as string | null;
    return {
      bulk_operations: res.bulk_operations ?? [],
      nextCursor: cursorOf(next),
      nextPageUrl: next,
    };
  },
};

export default action;
