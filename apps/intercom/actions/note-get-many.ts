import type { ActionDefinition } from "@w6w/types";
import { IntercomClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  page?: number;
  perPage?: number;
}

/**
 * GET /contacts/{id}/notes — list the notes attached to a contact, newest
 * first, with page-number pagination.
 */
const noteGetMany: ActionDefinition<Input> = {
  key: "note-get-many",
  type: "search",
  resource: "note",
  title: "List Notes",
  description: "List the notes attached to a contact.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { min: 1, integer: true },
      hint: "1-based page number.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Notes" },
    { key: "pages", type: "object", label: "Pagination" },
    { key: "total_count", type: "number", label: "Total count" },
  ],

  execute(input, ctx) {
    return new IntercomClient(ctx).request(
      `/contacts/${encodeURIComponent(input.contactId)}/notes`,
      { query: { page: input.page, per_page: input.perPage } },
    );
  },
};

export default noteGetMany;
