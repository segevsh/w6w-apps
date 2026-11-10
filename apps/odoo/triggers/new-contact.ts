import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-contacts.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action,
  input: () => ({ order: "create_date desc", limit: 100, offset: 0 }),
  items: (r) => (r as { records?: unknown[] }).records ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 1 },
  minIntervalMs: 300_000,
  maxPages: 1,
});
