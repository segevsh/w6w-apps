import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

type Input = Record<string, never>;

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List the account's webhook endpoints.",
  params: [],
  output: [{ key: "result", type: "array", label: "Webhooks" }],

  execute(_input, ctx) {
    return new QuadernoClient(ctx).request("/webhooks");
  },
};

export default webhookList;
