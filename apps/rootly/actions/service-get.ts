import type { ActionDefinition } from "@w6w/types";
import { itemResult, RootlyClient, seg } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `GET /v1/services/{id}` */
const serviceGet: ActionDefinition<Input> = {
  key: "service-get",
  type: "read",
  resource: "service",
  title: "Get Service",
  description: "Fetch one service by ID.",
  params: [
    {
      key: "id",
      label: "Service ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "item",
      type: "object",
      label: "The record, flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request("GET", `/v1/services/${seg(input.id)}`);
    return itemResult(res);
  },
};

export default serviceGet;
