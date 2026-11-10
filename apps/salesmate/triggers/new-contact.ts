import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactSearch from "../actions/contact-search.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Runs when Salesmate creates a contact.",
  action: contactSearch,
  input: () => ({ sortBy: "contact.createdAt", sortOrder: "desc", rows: 100, from: 0 }),
  items: (result) => (result as { records?: unknown[] }).records ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101, name: "Ada Lovelace" },
  maxPages: 1,
});
