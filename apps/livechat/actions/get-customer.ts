import type { ActionDefinition } from "@w6w/types";
import { LiveChatClient, requireString } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "get-customer",
  type: "read",
  resource: "customer",
  title: "Get customer",
  description: "A customer's profile, statistics, last visit and chat ids " +
    "(`POST /v3.6/agent/action/get_customer`). Needs the `customers:ro` scope.",
  params: [{ key: "customerId", label: "Customer ID", type: "string", required: true }],
  output: [{ key: "customer", type: "object", label: "The customer record" }],

  async execute(input, ctx) {
    const customer = await new LiveChatClient(ctx).agent("get_customer", {
      id: requireString(input.customerId, "customerId"),
    });
    return { customer };
  },
};

export default action;
