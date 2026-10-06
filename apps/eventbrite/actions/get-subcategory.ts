import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  subcategoryId: string;
}

const action: ActionDefinition<Input> = {
  key: "get-subcategory",
  type: "read",
  resource: "category",
  title: "Get Subcategory",
  description: "Retrieve a subcategory by ID.",
  idempotent: true,
  params: [{ key: "subcategoryId", label: "Subcategory ID", type: "string", required: true }],
  output: [{ key: "subcategory", type: "object", label: "Subcategory" }],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/subcategories/${encodeURIComponent(input.subcategoryId)}/`);
  },
};

export default action;
