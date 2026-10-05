import type { ActionDefinition } from "@w6w/types";
import { FellowClient, nonEmpty, paginationBody } from "../lib/client.ts";
import { CURSOR, ON_BEHALF_OF, PAGE_SIZE } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  cursor?: string;
  status?: string;
  createdAtStart?: string;
  onBehalfOf?: string;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List webhooks, one page at a time. A non-privileged key lists its own; a Super Admin key lists the whole account.",
  params: [
    PAGE_SIZE,
    CURSOR,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
    {
      key: "createdAtStart",
      label: "Created from",
      type: "string",
      hint: "YYYY-MM-DD or an ISO datetime.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "items", type: "array", label: "Webhooks on this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page (null at the end)" },
    { key: "pageSize", type: "number", label: "Page size used" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    if (input.pageSize !== undefined && input.pageSize !== null) paginationBody(input.pageSize);
    // GET endpoint: pagination rides in the query string, and `filters` is a JSON-encoded string.
    const filters = nonEmpty({ status: input.status, created_at_start: input.createdAtStart });
    return new FellowClient(ctx).page("webhooks", "/webhooks", {
      query: {
        page_size: input.pageSize,
        cursor: input.cursor,
        filters: filters ? JSON.stringify(filters) : undefined,
      },
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default webhookList;
