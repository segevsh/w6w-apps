import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-search.ts";

const trigger = pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "Emits contacts in Apollo's documented newest-updated-first order.",
  action,
  input: () => ({
    sort_by_field: "contact_updated_at",
    sort_ascending: false,
    page: 1,
    per_page: 100,
  }),
  items: (result) => (result as { contacts?: unknown[] }).contacts ?? [],
  idOf: (item) => {
    const contact = item as { id?: unknown; updated_at?: unknown; updatedAt?: unknown };
    return `${String(contact.id ?? "")}:${String(contact.updated_at ?? contact.updatedAt ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact-101" },
});

export default trigger;
