import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, resourceIdentifier } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * `POST /v1/contact_notes` — write a note on a contact.
 *
 * The most useful write-back in this app for support and ops workflows: it puts
 * a trace of what an automation did somewhere a human will actually see it, on
 * the contact record itself.
 *
 * The spec requires `type`, `attributes.body` and `relationships.contact.data`
 * — a note cannot exist detached from a contact. Note that unlike
 * `contact-create`, the required relationship here is the *contact*, not the
 * site: the site is implied by the contact.
 *
 * Not idempotent. There is no natural key on a note, so re-running creates a
 * second one; a retried workflow will leave duplicates rather than converge.
 */
interface Input {
  contactId: string;
  body: string;
}

const contactNoteCreate: ActionDefinition<Input> = {
  key: "contact-note-create",
  type: "perform",
  resource: "contact-note",
  title: "Create Contact Note",
  description:
    "Add a note to a contact's record — a good way to leave an audit trail a human will see.",
  idempotent: false,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "string",
      required: true,
      hint: "`contact-list` returns the ids.",
    },
    {
      key: "body",
      label: "Note",
      type: "string",
      required: true,
      ui: "textarea",
      hint: "The note text.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/contact_notes", {
      method: "POST",
      body: {
        data: {
          type: "contact_notes",
          attributes: { body: input.body },
          relationships: {
            contact: { data: resourceIdentifier(input.contactId, "contacts") },
          },
        },
      },
    });
  },
};

export default contactNoteCreate;
