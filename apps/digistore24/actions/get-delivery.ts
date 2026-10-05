import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  delivery_id: number;
  set_in_progress?: boolean;
}

const getDelivery: ActionDefinition<Input> = {
  key: "get-delivery",
  type: "read",
  title: "Get Delivery",
  description: "Return one delivery.",
  params: [
    { key: "delivery_id", label: "Delivery ID", type: "number", required: true },
    {
      key: "set_in_progress",
      label: "Mark in progress",
      type: "boolean",
      hint: "Also move the delivery to in-progress.",
    },
  ],
  output: [
    { key: "delivery", type: "object", label: "Delivery" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "getDelivery",
      compact({ delivery_id: input.delivery_id, set_in_progress: input.set_in_progress }),
    );
  },
};

export default getDelivery;
