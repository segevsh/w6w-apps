import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import noteGetMany from "../actions/note-get-many.ts";

/**
 * `GET /contacts/{id}/notes` returns the contact's notes ordered by id, descending by default
 * ("order ... Defaults to desc", https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/listnotes,
 * verified 2026-11-10), so page 1 is the newest notes (`pollFromListAction`, one page).
 */
export default pollFromListAction<{ contactId: string }>({
  key: "new-note",
  title: "New Note on Contact",
  description:
    "Fires when a note is added to the contact you pick. The run gets the note (id, body, author, creation time).",
  action: noteGetMany as unknown as ActionDefinition,
  params: [{
    key: "contactId",
    label: "Contact ID",
    type: "string",
    required: true,
    hint: "The Intercom contact whose notes to watch.",
  }],
  input: (params) => ({ contactId: params.contactId }),
  items: (result) => (result as { data?: unknown[] } | null)?.data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "body", type: "string", label: "Body (HTML)" },
    { key: "created_at", type: "number", label: "Created At (epoch seconds)" },
    { key: "author", type: "object", label: "Author (admin)" },
    { key: "contact", type: "object", label: "Contact" },
  ],
  sample: {
    type: "note",
    id: "17495962",
    created_at: 1762683400,
    contact: { type: "contact", id: "6543210fedcba9876543210f" },
    author: { type: "admin", id: "991267", name: "Ada Admin" },
    body: "<p>Asked about the annual plan.</p>",
  },
  maxPages: 1,
});
