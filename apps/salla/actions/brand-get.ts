import type { ActionDefinition } from "@w6w/types";
import { SallaClient, seg } from "../lib/client.ts";

interface Input {
  brand_id: number;
  with?: "translations";
}

const brandGet: ActionDefinition<Input> = {
  key: "brand-get",
  type: "read",
  resource: "brand",
  title: "Get Brand",
  description: "Fetch one brand by ID. Needs the `brands.read` scope.",

  params: [
    {
      "key": "brand_id",
      "label": "Brand ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "with",
      "label": "Include",
      "type": "select",
      "options": [
        {
          "value": "translations",
          "label": "translations",
        },
      ],
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
    return client.get(`/brands/${seg(input.brand_id)}`, {
      with: input.with,
    });
  },
};

export default brandGet;
