import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient } from "../lib/client.ts";

interface Input {
  subscriberId: string;
}

/**
 * `DELETE /api/subscribers/:id` — removes the subscriber from the account but
 * KEEPS their history in case they re-subscribe. The GDPR "erase everything"
 * operation is a different endpoint (`POST /subscribers/:id/forget`), which
 * this app deliberately does not expose: it is destructive, irreversible after
 * 30 days, and not something a workflow should be able to trigger by accident.
 *
 * ID only — unlike the GET, this path does not accept an email address.
 */
const deleteSubscriber: ActionDefinition<Input> = {
  key: "delete-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Delete Subscriber",
  description: "Remove a subscriber from the account by id. Their history is retained.",
  idempotent: true,
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    await client.request(`/subscribers/${encodeURIComponent(input.subscriberId)}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default deleteSubscriber;
