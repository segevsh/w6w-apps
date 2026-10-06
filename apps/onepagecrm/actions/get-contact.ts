import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/** `GET /contacts/{contact_id}` — one contact, with its next actions and related blocks. */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Fetch one contact: names, company, status, tags, phones, emails, URLs, addresses and custom fields.",
  params: [{ key: "contactId", label: "Contact ID", type: "string", required: true }],
  output: [
    { key: "contact", type: "object", label: "The contact" },
    { key: "next_actions", type: "array", label: "Next actions" },
  ],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data(`/contacts/${encodeId(input.contactId)}`);
  },
};

export default getContact;
