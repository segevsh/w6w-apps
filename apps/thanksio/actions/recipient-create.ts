import type { ActionDefinition } from "@w6w/types";
import { ThanksioClient } from "../lib/client.ts";
import { recipientBody, recipientFieldParams } from "../lib/params.ts";

/**
 * `POST /api/v2/recipients` — requires `mailing_list_id` plus either a mailing address or an
 * email (an email-only recipient triggers a paid address lookup).
 */
interface Input {
  mailingListId: number;
  [key: string]: unknown;
}

const recipientCreate: ActionDefinition<Input> = {
  key: "recipient-create",
  type: "perform",
  resource: "recipient",
  title: "Create Recipient",
  description: "Add a recipient to a mailing list. With no valid mailing address but a valid " +
    "email, thanks.io looks the street address up for an additional fee.",
  idempotent: false,
  params: [
    { key: "mailingListId", label: "Mailing list ID", type: "number", required: true },
    ...recipientFieldParams,
  ],
  output: [
    { key: "id", type: "number", label: "Recipient ID" },
    { key: "recipient", type: "object", label: "The recipient" },
  ],

  async execute(input, ctx) {
    const body = recipientBody(input);
    if (!body.address && !body.email) {
      throw new Error("A recipient needs an Address (with postal code) or an Email");
    }
    const recipient = await new ThanksioClient(ctx).call("/recipients", {
      method: "POST",
      body: { mailing_list_id: input.mailingListId, ...body },
    });
    return { id: recipient.id, recipient };
  },
};

export default recipientCreate;
