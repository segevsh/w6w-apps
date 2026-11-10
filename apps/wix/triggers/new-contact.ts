import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContacts from "../actions/list-contacts.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action: listContacts,
  input: () => ({ sortFieldName: "createdDate", sortOrder: "DESC", limit: 100, offset: 0 }),
  items: (r) => (r as { contacts?: unknown[] }).contacts ?? [],
  idOf: (i) => String((i as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "sample-id" },
  maxPages: 1,
});
