import type { ActionDefinition } from "@w6w/types";
import { compact, MightyClient } from "../lib/client.ts";

/** `POST /invites` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  recipientEmail: string;
  recipientFirstName?: string;
  recipientLastName?: string;
}

const inviteCreate: ActionDefinition<Input> = {
  key: "invite-create",
  type: "perform",
  resource: "invite",
  title: "Create Invite",
  description: "Invite someone by email. Mighty Networks sends the invitation email.",
  idempotent: false,
  params: [
    { key: "recipientEmail", label: "Recipient email", type: "string", required: true },
    { key: "recipientFirstName", label: "Recipient first name", type: "string" },
    { key: "recipientLastName", label: "Recipient last name", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Invite id" },
    { key: "recipient_email", type: "string", label: "Recipient email" },
    { key: "recipient_first_name", type: "string", label: "Recipient first name" },
    { key: "recipient_last_name", type: "string", label: "Recipient last name" },
    { key: "sender_id", type: "number", label: "Sender user id" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request("/invites", {
      method: "POST",
      body: compact({
        recipient_email: input.recipientEmail,
        recipient_first_name: input.recipientFirstName,
        recipient_last_name: input.recipientLastName,
      }),
    });
  },
};

export default inviteCreate;
