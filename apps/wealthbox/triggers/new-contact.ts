import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action: listContacts,
  input: () => ({ order: "created", page: 1, perPage: 100 }),
  items: (r) => (r as { contacts?: unknown[] }).contacts ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
