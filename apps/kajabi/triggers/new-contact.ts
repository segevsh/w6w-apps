import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created new contact.",
  action,
  input: () => ({ sort: "-created_at", pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; jnid?: unknown }).id ?? (item as { jnid?: unknown }).jnid ?? "",
    ),
  output: [{ key: "id", type: "string", label: "New Contact ID" }],
  sample: { id: "example" },
  maxPages: 1,
});
