import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Poll newest contacts through the existing contact-list action.",
  action: contactList,
  input: () => ({ page: 1, limit: 100, orderBy: "id", direction: "desc" }),
  items: (result) => (result as { resources?: unknown[] }).resources ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
