import type { ActionDefinition } from "@w6w/types";
import { buildBody, SallaClient, seg } from "../lib/client.ts";

interface Input {
  product_id: number;
  status: "sale" | "out" | "hidden";
}

const productChangeStatus: ActionDefinition<Input> = {
  key: "product-change-status",
  type: "perform",
  resource: "product",
  title: "Change Product Status",
  description:
    "Set a product's availability to sale, out of stock or hidden. Needs the `products.read_write` scope.",
  idempotent: true,
  params: [
    {
      "key": "product_id",
      "label": "Product ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "sale",
          "label": "sale",
        },
        {
          "value": "out",
          "label": "out",
        },
        {
          "value": "hidden",
          "label": "hidden",
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
    return client.post(
      `/products/${seg(input.product_id)}/status`,
      buildBody({
        status: input.status,
      }, undefined),
    );
  },
};

export default productChangeStatus;
