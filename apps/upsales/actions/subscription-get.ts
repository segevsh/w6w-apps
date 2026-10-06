import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/agreements/{id}` — Fetch one subscription by ID. */
interface Input {
  id: number;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Fetch one subscription by ID.",
  params: [idParam("id", "Subscription ID")],
  output: [{ key: "data", type: "object", label: "The subscription" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/agreements/${encodeId(input.id)}`);
    return { data };
  },
};

export default subscriptionGet;
