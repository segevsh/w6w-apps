import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, includeParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/orders/{id}` — one order, optionally with its line items side-loaded. */
interface Input {
  id: string;
  include?: string;
  fields?: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch one order by id.",
  params: [
    idParam("Order ID", "`order-list` returns the ids."),
    includeParam("e.g. `order_items` — avoids a second call to `order-item-list`."),
    fieldsParam("orders", "order_number,created_at"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/orders/${encodeURIComponent(input.id)}`, {
      query: {
        include: unset(input.include),
        "fields[orders]": unset(input.fields),
      },
    });
  },
};

export default orderGet;
