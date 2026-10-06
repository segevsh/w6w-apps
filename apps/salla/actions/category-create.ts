import type { ActionDefinition } from "@w6w/types";
import { buildBody, SallaClient } from "../lib/client.ts";

interface Input {
  name: string;
  status?: "active" | "hidden";
  image?: string;
  parent_id?: number;
  sort_order?: number;
  metadata_title?: string;
  metadata_description?: string;
  metadata_url?: string;
  additionalFields?: unknown;
}

const categoryCreate: ActionDefinition<Input> = {
  key: "category-create",
  type: "perform",
  resource: "category",
  title: "Create Category",
  description: "Create a category. Needs the `categories.read_write` scope.",
  idempotent: false,
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": [
        {
          "value": "active",
          "label": "active",
        },
        {
          "value": "hidden",
          "label": "hidden",
        },
      ],
    },
    {
      "key": "image",
      "label": "Image",
      "type": "string",
      "hint": "Category display image.",
    },
    {
      "key": "parent_id",
      "label": "Parent category ID",
      "type": "number",
    },
    {
      "key": "sort_order",
      "label": "Sort order",
      "type": "number",
    },
    {
      "key": "metadata_title",
      "label": "SEO title",
      "type": "string",
    },
    {
      "key": "metadata_description",
      "label": "SEO description",
      "type": "string",
    },
    {
      "key": "metadata_url",
      "label": "SEO URL",
      "type": "string",
    },
    {
      "key": "additionalFields",
      "label": "Additional fields",
      "type": "json",
      "hint":
        "JSON object of any further documented Salla body fields. Fields set above take precedence.",
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
    return client.post(
      "/categories",
      buildBody({
        name: input.name,
        status: input.status,
        image: input.image,
        parent_id: input.parent_id,
        sort_order: input.sort_order,
        metadata_title: input.metadata_title,
        metadata_description: input.metadata_description,
        metadata_url: input.metadata_url,
      }, input.additionalFields),
    );
  },
};

export default categoryCreate;
