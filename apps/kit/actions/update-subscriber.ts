import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  subscriberId: number;
  emailAddress: string;
  firstName?: string;
  fields?: Record<string, string>;
}

const updateSubscriber: ActionDefinition<Input> = {
  key: "update-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Update Subscriber",
  description:
    "Update a subscriber's email address, first name, and custom field values. Kit requires `emailAddress` on every update. A maximum of 140 custom fields may be set at a time.",
  idempotent: true,
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "number", required: true },
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      hint: "Required by Kit even when unchanged.",
    },
    { key: "firstName", label: "First name", type: "string" },
    {
      key: "fields",
      label: "Custom fields",
      type: "json",
      hint:
        'JSON object keyed by each custom field\'s `key` (e.g. `{"last_name": "Lovelace"}`), not its label.',
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    const body: Record<string, unknown> = { email_address: input.emailAddress };
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.fields !== undefined) body.fields = input.fields;
    return new KitClient(ctx).request(`/subscribers/${input.subscriberId}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateSubscriber;
