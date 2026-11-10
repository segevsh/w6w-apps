import { walkTrigger } from "../lib/walk.ts";
import listContacts from "../actions/list-contacts.ts";
import { PAGE, parseWealthboxStamp, windowRequest } from "../lib/since.ts";

type Contact = { id?: unknown; updated_at?: unknown };

/**
 * `updated_since` (https://dev.wealthbox.com/: "Only returns contacts updated on or after this
 * timestamp") from the last check. The dedupe key is `id:updated_at`, so an edit is a new event.
 */
export default walkTrigger({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each created or edited contact.",
  action: listContacts as never,
  first: ({ sinceMs }) => windowRequest(sinceMs, 1),
  next: (req, _result, got) =>
    got.length >= PAGE ? { ...req, page: Number(req.page) + 1 } : undefined,
  items: (r) => (r as { contacts?: unknown[] }).contacts ?? [],
  idOf: (i) => {
    const x = i as Contact;
    return `${String(x.id ?? "")}:${String(x.updated_at ?? "")}`;
  },
  stampOf: (i) => parseWealthboxStamp((i as Contact).updated_at),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 1,
    name: "Ada Lovelace",
    created_at: "2026-11-09 10:00 AM -0500",
    updated_at: "2026-11-09 11:15 AM -0500",
  },
});
