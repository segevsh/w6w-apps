import type { ActionDefinition } from "@w6w/types";
import { compact, IntercomClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  body: string;
  adminId?: string;
}

/**
 * POST /contacts/{id}/notes — attach a note to a contact. `admin_id` is optional
 * and attributes the note to a specific admin; without it Intercom records it
 * against the authoring app.
 */
const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Add a note to a contact.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "body",
      label: "Body",
      type: "text",
      required: true,
      hint: "The text of the note. Accepts some HTML.",
    },
    {
      key: "adminId",
      label: "Admin ID",
      type: "string",
      advanced: true,
      hint: "Attribute the note to this admin.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "type", type: "string", label: "Type" },
  ],

  execute(input, ctx) {
    const body = compact({ body: input.body, admin_id: input.adminId });
    return new IntercomClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/notes`,
      { method: "POST", body },
    );
  },
};

export default noteCreate;
