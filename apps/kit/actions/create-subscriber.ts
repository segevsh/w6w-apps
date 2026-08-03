import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface Input {
  emailAddress: string;
  firstName?: string;
  state?: "active" | "cancelled" | "bounced" | "complained" | "inactive";
  fields?: Record<string, string>;
}

/**
 * `idempotent: true` — Kit documents this endpoint as an upsert: a repeat call
 * with the same email address updates the existing subscriber's first name and
 * returns 200 rather than creating a duplicate.
 */
const createSubscriber: ActionDefinition<Input> = {
  key: "create-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Create Subscriber",
  description:
    "Create a subscriber. Behaves as an upsert — an existing email address has its first name updated rather than being duplicated. Kit does not support changing `state` through this endpoint once the subscriber exists.",
  idempotent: true,
  params: [
    {
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      placeholder: "name@email.com",
    },
    { key: "firstName", label: "First name", type: "string" },
    {
      key: "state",
      label: "State",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "bounced", label: "Bounced" },
        { value: "complained", label: "Complained" },
        { value: "cancelled", label: "Cancelled" },
      ],
      hint:
        "Applied on creation only; Kit ignores it for an email address that already exists. Defaults to `active`.",
    },
    {
      key: "fields",
      label: "Custom fields",
      type: "json",
      hint:
        'JSON object keyed by each custom field\'s `key` (e.g. `{"last_name": "Lovelace"}`), not its label. Unknown keys are reported in the response `warnings`.',
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    const body: Record<string, unknown> = { email_address: input.emailAddress };
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.state !== undefined) body.state = input.state;
    if (input.fields !== undefined) body.fields = input.fields;
    return new KitClient(ctx).request("/subscribers", { method: "POST", body });
  },
};

export default createSubscriber;
