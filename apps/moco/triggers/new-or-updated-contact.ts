import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each newly created or updated MOCO contact.",
  action: contactList,
  input: () => ({ page: 1, perPage: 100, updatedAfter: "1970-01-01T00:00:00Z" }),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: (item) => {
    const contact = item as { id?: unknown; updated_at?: unknown };
    return `${String(contact.id ?? "")}:${String(contact.updated_at ?? "")}`;
  },
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101, updated_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
