import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Polls the newest Salesmsg contacts from contact-list.",
  action: contactList,
  input: (params) => ({ ...params, sortBy: "created_at", sortOrder: "desc", page: 1, length: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  params: contactList.params,
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact_123", first_name: "Ada" },
  maxPages: 1,
});
