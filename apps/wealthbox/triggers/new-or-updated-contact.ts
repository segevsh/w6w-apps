import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "The run gets each created or edited contact.",
  action: listContacts,
  input: () => ({ order: "updated", page: 1, perPage: 100 }),
  items: (r) => (r as { contacts?: unknown[] }).contacts ?? [],
  idOf: (i) => {
    const x = i as { id?: unknown; updated_at?: unknown; updatedAt?: unknown };
    return `${String(x.id ?? "")}:${String(x.updated_at ?? x.updatedAt ?? "")}`;
  },
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
