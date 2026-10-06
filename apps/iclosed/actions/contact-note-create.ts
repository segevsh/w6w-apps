import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/contacts/notes` — Add a note to a contact.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  contactId: number;
  note: string;
}

const contactNoteCreate: ActionDefinition<Input> = {
  key: "contact-note-create",
  type: "perform",
  resource: "contact",
  title: "Create contact note",
  description: "Add a note to a contact.",
  idempotent: false,
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      required: true,
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/contacts/notes", {
      method: "POST",
      body: compact({ contactId: input.contactId, note: input.note }),
    });
  },
};

export default contactNoteCreate;
