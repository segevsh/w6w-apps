import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-contacts.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created new contact.",
  action,
  input: () => ({ sortBy: "created_at", sortOrder: "desc", page: 1 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New Contact ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
