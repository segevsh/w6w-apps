import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactFilter from "../actions/contact-filter.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly added to the account.",
  action: contactFilter,
  input: () => ({ sortBy: "addedOn", sortDirection: "desc", top: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: 101, email: "ada@example.com" },
  maxPages: 1,
});
