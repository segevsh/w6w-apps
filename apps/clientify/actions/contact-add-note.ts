import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `POST /v1/contacts/{contactId}/note/` — Add a note to a contact's wall. Sent as multipart form data, the shape Clientify's reference shows for this endpoint.
 */
interface Input {
  contactId: string;
  name: string;
  comment: string;
}

const contactAddNote: ActionDefinition<Input, unknown> = {
  key: "contact-add-note",
  type: "perform",
  resource: "note",
  title: "Add Note to Contact",
  description:
    "Add a note to a contact's wall. Sent as multipart form data, the shape Clientify's reference shows for this endpoint.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    { key: "name", label: "Note title", type: "string", required: true },
    { key: "comment", label: "Note text", type: "text", required: true },
  ],
  output: [
    { key: "status", type: "string", label: "`ok` when accepted" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    const form = new FormData();
    form.set("name", input.name);
    form.set("comment", input.comment);
    return client.request(`/v1/contacts/${encodeURIComponent(input.contactId)}/note/`, {
      method: "POST",
      form,
    });
  },
};

export default contactAddNote;
