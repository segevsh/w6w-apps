import type { ActionDefinition } from "@w6w/types";
import { compact, SendfoxClient } from "../lib/client.ts";

/**
 * `PATCH /unsubscribe` — unsubscribe a contact by email.
 *
 * The odd one out in the contact surface: it is a top-level path (not nested
 * under `/contacts/{id}`) and it addresses the contact by **email**, not id. That
 * makes it the right tool when a workflow has an address from an external source
 * and no SendFox id to hand.
 *
 * Answers the bare `Contact` entity. Idempotent: unsubscribing an already
 * unsubscribed address lands on the same state.
 */
interface Input {
  email: string;
}

const contactUnsubscribe: ActionDefinition<Input> = {
  key: "contact-unsubscribe",
  type: "perform",
  resource: "contact",
  title: "Unsubscribe Contact",
  description: "Unsubscribe a contact by email address.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "reader@example.com",
      hint: "The address to unsubscribe. SendFox resolves the contact by email.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact id" },
    { key: "email", type: "string", label: "Email" },
    { key: "unsubscribed_at", type: "string", label: "Unsubscribed at" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/unsubscribe", {
      method: "PATCH",
      body: compact({ email: input.email }),
    });
  },
};

export default contactUnsubscribe;
