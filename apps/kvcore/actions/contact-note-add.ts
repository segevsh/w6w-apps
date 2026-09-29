import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  contact_id: string;
  title?: string;
  details?: string;
  date?: string;
  action_owner_user_id?: string;
}

/**
 * `PUT /v2/public/contact/{contact_id}/action/note` — add a note to a
 * contact.
 *
 * `details` supports inline hashtags (`#hotlead`), which kvCORE parses and
 * applies to the contact automatically — that is the vendor's own behaviour,
 * not something this action does.
 *
 * The vendor's Contact Management guide warns that a contact created via
 * `contact-create` may take up to 30 seconds before a note can be added to
 * it — a caller chaining create then note-add in the same run should expect
 * that gap.
 */
const contactNoteAdd: ActionDefinition<Input> = {
  key: "contact-note-add",
  type: "perform",
  resource: "contact",
  title: "Add Note to Contact",
  description:
    "Add a note to a contact. A contact created moments earlier via Create Contact may not be " +
    "ready to receive a note for up to 30 seconds.",
  idempotent: false,
  params: [
    { key: "contact_id", label: "Contact ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string" },
    {
      key: "details",
      label: "Details",
      type: "text",
      hint: "Inline #hashtags are applied to the contact automatically.",
    },
    {
      key: "date",
      label: "Date",
      type: "datetime",
      hint: "Defaults to the current date/time if omitted.",
    },
    {
      key: "action_owner_user_id",
      label: "Owner user ID",
      type: "string",
      hint: "Company-admin tokens only — attributes the note to another user. Ignored otherwise.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Note (action) ID" },
    { key: "contact_id", type: "number", label: "Contact ID" },
  ],

  async execute(input, ctx) {
    const { contact_id, ...body } = input;
    return await new KvCoreClient(ctx).json(
      `/contact/${encodeURIComponent(contact_id)}/action/note`,
      { method: "PUT", body },
    );
  },
};

export default contactNoteAdd;
