import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  page?: number;
  continuation?: string;
}

const action: ActionDefinition<Input> = {
  key: "list-subcategories",
  type: "search",
  resource: "category",
  title: "List Subcategories",
  description: "List all available subcategories. Paginated.",
  idempotent: true,
  params: [
    { key: "page", label: "Page number", type: "number" },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "locale", type: "string", label: "Locale" },
    { key: "subcategories", type: "array", label: "List Subcategories" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request("/subcategories/", {
      query: { page: input.page, continuation: input.continuation },
    });
  },
};

export default action;
