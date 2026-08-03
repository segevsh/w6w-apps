import type { ActionDefinition } from "@w6w/types";
import { MailjetClient, type MailjetEnvelope } from "../lib/client.ts";
import type { MailjetContact } from "./list-contacts.ts";

interface Input {
  contact: string;
}

/**
 * Fetch one contact by numeric ID **or** by email address.
 *
 * Mailjet accepts either in the same path segment — `/contact/1234` and
 * `/contact/a@example.com` both resolve. That is worth having as one action
 * rather than two, because a workflow usually has whichever identifier the
 * upstream step happened to produce, and the email form saves a lookup.
 *
 * The response is the standard v3 envelope: a **one-element `Data` array**, not a
 * bare object, even for a single-record read. Downstream steps want `Data[0]`.
 */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Fetch one contact by numeric ID or email address (GET /v3/REST/contact/{id_or_email}). " +
    "Returns the usual envelope — the contact is `Data[0]`.",
  params: [
    {
      key: "contact",
      label: "Contact ID or email",
      type: "string",
      required: true,
      hint: "Either form works: `1234` or `person@example.com`.",
    },
  ],
  output: [
    { key: "Data", type: "array", label: "Contact" },
    { key: "Count", type: "number", label: "Count" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetContact>>(
      `/contact/${encodeURIComponent(input.contact)}`,
    );
  },
};

export default getContact;
