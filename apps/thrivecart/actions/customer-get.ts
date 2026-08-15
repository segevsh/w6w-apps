import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

/**
 * `POST /customer` — one customer's full purchase and subscription history,
 * looked up by email. Despite the verb, this reads a single record (no side
 * effect) and the collection has no GET equivalent, so it is typed `read`
 * rather than `search`.
 */
interface Input {
  email: string;
  mode?: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Read a customer's full purchase and subscription history by email.",
  params: [
    { key: "email", label: "Customer email", type: "string", required: true },
    modeParam,
  ],
  output: [
    { key: "customer", type: "object", label: "Customer" },
    { key: "purchases", type: "array", label: "One-time purchases" },
    { key: "subscriptions", type: "array", label: "Subscriptions" },
    { key: "lifetime_value", type: "object", label: "Lifetime value by currency" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/customer", {
      form: { email: input.email },
      mode: input.mode,
    });
  },
};

export default customerGet;
