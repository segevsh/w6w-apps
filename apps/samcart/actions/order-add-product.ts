import type { ActionDefinition } from "@w6w/types";
import { intId, SamCartClient } from "../lib/client.ts";

/** `POST /v1/orders/{orderId}/add-to-order` */
interface Input {
  orderId: number;
  productId: number;
}

const orderAddProduct: ActionDefinition<Input> = {
  key: "order-add-product",
  type: "perform",
  resource: "order",
  title: "Add Product to Order",
  description:
    "Charge a product to an existing order. This takes real money from the customer and is not safe to retry: the reference documents a 409 when the product could not be charged, and nothing that deduplicates a repeat.",
  idempotent: false,
  params: [
    {
      "key": "orderId",
      "label": "Order ID",
      "type": "number",
      "required": true,
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
    {
      "key": "productId",
      "label": "Product ID",
      "type": "number",
      "required": true,
      "hint": "Must belong to the same marketplace as the order.",
      "validation": {
        "integer": true,
        "min": 1,
      },
    },
  ],
  output: [
    {
      "key": "response",
      "type": "object",
      "label": "The vendor response body (undocumented in the reference; null when empty)",
    },
  ],

  async execute(input, ctx) {
    const body = await new SamCartClient(ctx).call(
      "POST",
      `/orders/${intId(input.orderId, "Order ID")}/add-to-order`,
      {
        json: {
          product_id: Number(intId(input.productId, "Product ID")),
        },
      },
    );
    return { response: body };
  },
};

export default orderAddProduct;
