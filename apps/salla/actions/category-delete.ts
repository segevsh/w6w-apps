import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  category_id: number;
}

const categoryDelete: ActionDefinition<Input> = {
  key: "category-delete",
  type: "perform",
  resource: "category",
  title: "Delete Category",
  description: "Delete a category by ID. Needs the `categories.read_write` scope.",
  idempotent: true,
  params: [
    {
      "key": "category_id",
      "label": "Category ID",
      "type": "number",
      "required": true,
    },
  ],
  output: [
    {
      "key": "deleted",
      "type": "boolean",
      "label": "True when Salla accepted the delete",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.delete(`/categories/${seg(input.category_id)}`);
  },
};

export default categoryDelete;
