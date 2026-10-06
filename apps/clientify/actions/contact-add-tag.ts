import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient, compact } from "../lib/client.ts";

/**
 * `POST /v1/contacts/{contactId}/tags/` — Add a tag to a contact by name.
 */
interface Input {
  contactId: string;
  name: string;
}

const contactAddTag: ActionDefinition<Input, unknown> = {
  key: "contact-add-tag",
  type: "perform",
  resource: "tag",
  title: "Add Tag to Contact",
  description: "Add a tag to a contact by name.",
  idempotent: true,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "name", label: "Tag name", type: "string", required: true },
  ],
  output: [
    { key: "name", type: "string", label: "Tag name" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/contacts/${encodeURIComponent(input.contactId)}/tags/`, {
      method: "POST",
      body: compact({ name: input.name }),
    });
  },
};

export default contactAddTag;
