import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-contacts.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description:
    "The run gets each newly created contact, oldest first, polled from the existing `list-contacts` action sorted by `created_at` descending.",
  action,
  input: () => ({ sortBy: "created_at", sortOrder: "desc", page: 1 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "attributes", type: "object", label: "Contact attributes (default field set)" },
  ],
  sample: { id: "4821", type: "contact", attributes: { first_name: "Ada", last_name: "Lovelace" } },
  maxPages: 1,
});
