import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action,
  input: () => ({ orderBy: "first_seen_at", page: 1, pageLength: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: [{ key: "uuid", type: "string", label: "Contact ID" }],
  sample: { uuid: "contact-1", email: "ada@example.com" },
  maxPages: 1,
});
