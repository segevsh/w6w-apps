import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactsList from "../actions/contacts-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Poll contacts returned by the existing contacts-list action.",
  action: contactsList,
  input: () => ({ pageSize: 100, pageNumber: 1 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "sample-contact" },
  maxPages: 1,
});
