import type { ActionDefinition } from "@w6w/types";
import { compact, UscreenClient } from "../lib/client.ts";

interface Input {
  name: string;
  billingEmail: string;
  planId: number;
  numberOfSeats?: number;
}

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a group subscription.",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    { "key": "billingEmail", "label": "Billing email", "type": "string", "required": true },
    {
      "key": "planId",
      "label": "Subscription plan ID",
      "type": "number",
      "required": true,
      "validation": { "integer": true },
    },
    {
      "key": "numberOfSeats",
      "label": "Number of seats",
      "type": "number",
      "hint": "Leave empty for no seat limit.",
      "validation": { "integer": true, "min": 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Record id (the full vendor object is returned)" },
  ],

  async execute(input, ctx) {
    return (await new UscreenClient(ctx).call<Record<string, unknown>>("POST", "/groups", {
      body: compact({
        "name": input.name,
        "billing_email": input.billingEmail,
        "plan_id": input.planId,
        "number_of_seats": input.numberOfSeats,
      }),
    })) ?? {};
  },
};

export default groupCreate;
