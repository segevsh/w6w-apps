import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Polls the existing contact-list action ordered by creation time descending.",
  action,
  input: () => ({ page: 1, perPage: 100, sortBy: "created_at:desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101 },
});
