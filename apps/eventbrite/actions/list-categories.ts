import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  page?: number;
  continuation?: string;
}

const action: ActionDefinition<Input> = {
  key: "list-categories",
  type: "search",
  resource: "category",
  title: "List Categories",
  description: "List all event categories, with subcategories nested. Paginated.",
  idempotent: true,
  params: [
    { key: "page", label: "Page number", type: "number" },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "locale", type: "string", label: "Locale" },
    { key: "categories", type: "array", label: "List Categories" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request("/categories/", {
      query: { page: input.page, continuation: input.continuation },
    });
  },
};

export default action;
