import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

/**
 * `POST /customerEmailUpdate` — change a customer's email across all their
 * orders and customer-hub access. One of two endpoints in this app with a
 * JSON body rather than a form-encoded one (see `subscribe`).
 *
 * The vendor's own description: "When the new email matches an existing
 * customer in your account, explicit merge confirmation is required to
 * prevent accidental data consolidation" — `allowMerge` defaults to `false`
 * here for exactly that reason; consolidating two customers' order history
 * is not something to opt into by omission.
 */
interface Input {
  currentEmail: string;
  newEmail: string;
  allowMerge?: boolean;
  mode?: string;
}

const customerEmailUpdate: ActionDefinition<Input> = {
  key: "customer-email-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer Email",
  description: "Change a customer's email address across their orders and customer-hub access.",
  idempotent: true,
  params: [
    { key: "currentEmail", label: "Current email", type: "string", required: true },
    { key: "newEmail", label: "New email", type: "string", required: true },
    {
      key: "allowMerge",
      label: "Allow merge",
      type: "boolean",
      default: false,
      hint: "Required if the new email already belongs to another customer — confirms you " +
        "intend to consolidate the two customers' order history.",
    },
    modeParam,
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
    { key: "data", type: "object", label: "Updated customer" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/customerEmailUpdate", {
      json: {
        current_email: input.currentEmail,
        new_email: input.newEmail,
        allow_merge: input.allowMerge ?? false,
      },
      mode: input.mode,
    });
  },
};

export default customerEmailUpdate;
