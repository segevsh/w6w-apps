import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "Polls the existing contact-list action ordered by updated_at descending.",
  action,
  input: () => ({ page: 1, perPage: 100, sortBy: "updated_at:desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { updated_at?: unknown }).updated_at ?? ""}`,
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101, updated_at: "2026-11-09T12:00:00Z" },
});
