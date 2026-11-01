import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";
import { CATEGORY_OUTPUT, CATEGORY_SAMPLE } from "../lib/outputs.ts";

interface Input {
  categoryId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-category",
  type: "read",
  resource: "category",
  title: "Get Category",
  description: "Retrieve a category by ID.",
  idempotent: true,
  params: [{ key: "categoryId", label: "Category ID", type: "string", required: true }],
  output: [...CATEGORY_OUTPUT],
  sample: CATEGORY_SAMPLE,

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/categories/${encodeURIComponent(input.categoryId)}/`);
  },
};

export default action;
