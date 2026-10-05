import type { ActionDefinition } from "@w6w/types";
import { SamCartClient, toIntList } from "../lib/client.ts";

/** `POST /v1/orders/batch-add-to-order` */
interface Input {
  orderIds: string;
  productIds: string;
}

const orderBatchAddProduct: ActionDefinition<Input> = {
  key: "order-batch-add-product",
  type: "perform",
  resource: "order",
  title: "Batch Add Products to Orders",
  description:
    "Charge each of up to 25 products to each of up to 5,000 orders, asynchronously. Takes real money and is not safe to retry. Poll Get Batch Add Status with the returned batch id.",
  idempotent: false,
  params: [
    {
      "key": "orderIds",
      "label": "Order IDs",
      "type": "string",
      "required": true,
      "hint": "Comma-separated order ids, 1-5,000, unique.",
    },
    {
      "key": "productIds",
      "label": "Product IDs",
      "type": "string",
      "required": true,
      "hint": "Comma-separated product ids, 1-25, unique.",
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
    const body = await new SamCartClient(ctx).call("POST", `/orders/batch-add-to-order`, {
      json: {
        order_ids: toIntList(input.orderIds, "Order IDs"),
        product_ids: toIntList(input.productIds, "Product IDs"),
      },
    });
    return { response: body };
  },
};

export default orderBatchAddProduct;
