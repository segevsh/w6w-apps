import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { ORDER_DETAIL_FIELDS, orderUnion } from "../lib/fields.ts";

interface Input {
  id: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order (Quote or Invoice)",
  description:
    "Fetch a quote or invoice by ID when you do not know which it is; `__typename` says which.",
  params: [
    { key: "id", label: "Order ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, unknown>>(
      `query($id: ID!) { order(id: $id) { ${orderUnion(ORDER_DETAIL_FIELDS)} } }`,
      { id: input.id },
    );
    return data.order;
  },
};

export default orderGet;
