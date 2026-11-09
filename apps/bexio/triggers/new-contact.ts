import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action: contactList,
  input: () => ({ orderBy: "id", descending: true, limit: 100, offset: 0 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
