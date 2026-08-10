import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `PATCH /v1/contact_notes/{id}` — rewrite a note.
 *
 * `body` is the only editable attribute, and the spec marks it **required** on
 * the update — so unlike `contact-update` this is a full replacement of the
 * note text, not a sparse patch. There is nothing else on a note to leave
 * alone.
 *
 * A note cannot be moved between contacts: the update schema has no
 * `relationships`, so the contact it belongs to is fixed at creation.
 */
interface Input {
  id: string;
  body: string;
}

const contactNoteUpdate: ActionDefinition<Input> = {
  key: "contact-note-update",
  type: "perform",
  resource: "contact-note",
  title: "Update Contact Note",
  description:
    "Replace a contact note's text. The note stays on the contact it was created against.",
  idempotent: true,
  params: [
    idParam("Note ID", "`contact-note-list` returns the ids."),
    {
      key: "body",
      label: "Note",
      type: "string",
      required: true,
      ui: "textarea",
      hint: "Replaces the note's text entirely — Kajabi requires this field on an update.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/contact_notes/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: {
        data: { id: String(input.id), type: "contact_notes", attributes: { body: input.body } },
      },
    });
  },
};

export default contactNoteUpdate;
