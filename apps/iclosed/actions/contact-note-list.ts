import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/contacts/notes` — List the notes on a contact.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  contactId: number;
  limit?: number;
  page?: number;
}

const contactNoteList: ActionDefinition<Input> = {
  key: "contact-note-list",
  type: "read",
  resource: "contact",
  title: "List contact notes",
  description: "List the notes on a contact.",
  params: [
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
      required: true,
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Records per page (maximum 100). Vendor default 20.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total notes" },
    { key: "data", type: "array", label: "Notes" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/contacts/notes", {
      query: { contactId: input.contactId, limit: input.limit, page: input.page },
    });
  },
};

export default contactNoteList;
