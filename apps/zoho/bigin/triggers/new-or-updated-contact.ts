import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description: "Polls the existing contact-list action ordered by Modified_Time descending.",
  action: action as never,
  input: () => ({
    fields: "id,Modified_Time",
    page: 1,
    per_page: 100,
    sort_by: "Modified_Time",
    sort_order: "desc",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${
      (item as { Modified_Time?: unknown }).Modified_Time ?? ""
    }`,
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact-101", Modified_Time: "2026-11-09T12:00:00+00:00" },
});
