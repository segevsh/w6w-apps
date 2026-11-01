import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { PAGINATION_SAMPLE, SUBCATEGORY_LIST_OUTPUT, SUBCATEGORY_SAMPLE } from "../lib/outputs.ts";

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
  output: [...SUBCATEGORY_LIST_OUTPUT],
  sample: { locale: "en_US", subcategories: [SUBCATEGORY_SAMPLE], pagination: PAGINATION_SAMPLE },

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request("/subcategories/", {
      query: { page: input.page, continuation: input.continuation },
    });
  },
};

export default action;
