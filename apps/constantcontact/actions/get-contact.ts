import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  include?: string;
}

/**
 * `GET /v3/contacts/{contact_id}` — a single contact by its UUID.
 *
 * The path takes an ID only; there is no by-email variant. To resolve an
 * address to a `contact_id`, run List Contacts with the `email` filter first.
 */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by `contact_id`, optionally with its sub-resources.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "UUID. Use List Contacts with an `email` filter to look one up by address.",
    },
    {
      key: "include",
      label: "Include sub-resources",
      type: "string",
      hint:
        "Comma-separated: `custom_fields`, `list_memberships`, `phone_numbers`, `street_addresses`, `taggings`, `notes`.",
    },
  ],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    return client.request(`/contacts/${encodeURIComponent(input.contactId)}`, {
      query: { include: input.include },
    });
  },
};

export default getContact;
