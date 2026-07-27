import type { ActionDefinition } from "@w6w/types";
import { IntercomClient } from "../lib/client.ts";

interface Input {
  contactId: string;
}

/**
 * GET /contacts/{id} — fetch a single contact by its Intercom id (not the
 * `external_id`; use Search Contacts to resolve an external id first).
 */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Retrieve a single contact by its Intercom contact ID.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "The Intercom id, e.g. `5ba682d23d7cf92bef87bfd4`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new IntercomClient(ctx).request(`/contacts/${encodeURIComponent(input.contactId)}`);
  },
};

export default contactGet;
