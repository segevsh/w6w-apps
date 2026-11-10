import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created new contact.",
  action,
  input: () => ({ sort_field: "date_created", sort_direction: "desc", size: 100, offset: 0 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New Contact ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
