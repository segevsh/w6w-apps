import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg, toArray } from "../lib/client.ts";

interface Input {
  category_id: number;
  with?: string | number | Array<string | number>;
}

const categoryGet: ActionDefinition<Input> = {
  key: "category-get",
  type: "read",
  resource: "category",
  title: "Get Category",
  description: "Fetch one category by ID. Needs the `categories.read` scope.",

  params: [
    {
      "key": "category_id",
      "label": "Category ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "with",
      "label": "Include",
      "type": "string",
      "hint": "Comma-separated: translations, items.",
    },
  ],
  output: [
    {
      "key": "status",
      "type": "number",
      "label": "HTTP status echoed in the envelope",
    },
    {
      "key": "success",
      "type": "boolean",
      "label": "Always true on success",
    },
    {
      "key": "data",
      "type": "object",
      "label": "The record",
    },
  ],

  execute(input, ctx) {
    const client = new SallaClient(ctx);
    return client.get(`/categories/${seg(input.category_id)}`, {
      with: toArray(input.with, "with"),
    });
  },
};

export default categoryGet;
