import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `GET /v2/sales/:saleId`
 * Needs the `view_sales` or `account` scope.
 */
interface Input {
  saleId: string;
}

const saleGet: ActionDefinition<Input> = {
  key: "sale-get",
  type: "read",
  resource: "sale",
  title: "Get Sale",
  description: "Fetch one sale. Needs the `view_sales` or `account` scope.",
  params: [{
    "key": "saleId",
    "label": "Sale ID",
    "type": "string",
    "required": true,
    "hint": "The sale's `id` from List Sales.",
  }],
  output: [{ "key": "id", "type": "string", "label": "Sale id" }, {
    "key": "email",
    "type": "string",
    "label": "Buyer email",
  }, { "key": "price", "type": "number", "label": "Price in cents" }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call("GET", `/sales/${seg(input.saleId)}`);
    return body.sale;
  },
};

export default saleGet;
