import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  identifier: string;
}

/**
 * `GET /api/subscribers/(:id or :email)` — the same path segment accepts either
 * a numeric subscriber id or an email address, so this takes one field rather
 * than two mutually exclusive ones.
 */
const getSubscriber: ActionDefinition<Input> = {
  key: "get-subscriber",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description: "Fetch a single subscriber by id or email address.",
  params: [
    {
      key: "identifier",
      label: "Subscriber ID or email",
      type: "string",
      required: true,
      placeholder: "name@example.com",
      hint: "MailerLite accepts either in the same path position.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Subscriber" }],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope>(
      `/subscribers/${encodeURIComponent(input.identifier)}`,
    );
  },
};

export default getSubscriber;
