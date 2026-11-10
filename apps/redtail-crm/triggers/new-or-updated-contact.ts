import contactSearch from "../actions/contact-search.ts";
import { sinceTrigger } from "../lib/triggers.ts";

/** `GET /contacts/search` takes the documented `updated_since`; the action exposes no paging. */
export default sinceTrigger({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each contact when it is created or updated.",
  action: contactSearch,
  pageSize: 100,
  input: ({ since }) => ({ updatedSince: since }),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: (item) => {
    const c = item as { id?: unknown; updated_at?: unknown };
    return `${c.id ?? ""}:${c.updated_at ?? ""}`;
  },
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "type", type: "string", label: "Type" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 9222,
    type: "individual",
    first_name: "Jane",
    last_name: "Smith",
    created_at: "2026-11-01T09:00:00Z",
    updated_at: "2026-11-10T09:00:00Z",
  },
});
