import type { ActionDefinition } from "@w6w/types";
import { LushaClient, seg } from "../lib/client.ts";

interface Input {
  id: string;
}

const action: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Webhook Subscription",
  description: "One webhook subscription by id.",
  params: [
    { key: "id", label: "Subscription ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription id" },
  ],

  execute(input, ctx) {
    return new LushaClient(ctx).request("GET", `/api/subscriptions/${seg(input.id)}`, {});
  },
};

export default action;
