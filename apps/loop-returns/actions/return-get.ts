import type { ActionDefinition } from "@w6w/types";
import { LoopClient } from "../lib/client.ts";

/**
 * Get Return.
 *
 * `GET /warehouse/return/details`. Loop requires one of `return_id`, `order_id` or `order_name`. When nothing matches, Loop answers HTTP 200 with `{"error": {"message": "No return found with this ID."}}`; the client treats that body as a failure.
 */
interface Input {
  returnId?: number;
  orderId?: number;
  orderName?: string;
  currencyType?: string;
}

const action: ActionDefinition<Input> = {
  key: "return-get",
  type: "read",
  resource: "return",
  title: "Get Return",
  description: "Fetch one return in full by return ID, order ID or order name.",
  params: [
    {
      key: "returnId",
      label: "Return ID",
      type: "number",
      hint: "Loop's return id. Give exactly one of return ID, order ID or order name.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "orderId",
      label: "Order ID (commerce provider)",
      type: "number",
      hint: "The order id from the commerce provider (e.g. Shopify's numeric order id).",
      validation: { integer: true, min: 1 },
    },
    {
      key: "orderName",
      label: "Order name",
      type: "string",
      hint: "The commerce provider's order name, e.g. `#1001` as Shopify shows it (`1001`).",
    },
    {
      key: "currencyType",
      label: "Currency type",
      type: "select",
      hint: "`shop` for the shop's currency, `presentment` for what the shopper saw.",
      options: [{ value: "shop", label: "Shop currency" }, {
        value: "presentment",
        label: "Presentment currency",
      }],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Return ID" },
    { key: "state", type: "string", label: "Return state" },
    { key: "order_name", type: "string", label: "Order name" },
    { key: "line_items", type: "array", label: "Returned line items" },
  ],

  async execute(input, ctx) {
    if (input.returnId === undefined && input.orderId === undefined && !input.orderName) {
      throw new Error("Give a return ID, an order ID or an order name.");
    }
    return await new LoopClient(ctx).get("/warehouse/return/details", {
      return_id: input.returnId,
      order_id: input.orderId,
      order_name: input.orderName,
      currency_type: input.currencyType,
    });
  },
};

export default action;
