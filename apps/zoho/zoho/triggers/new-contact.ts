import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Polls the existing contact-list action ordered by Created_Time descending.",
  action: action as never,
  input: () => ({
    fields: "id,Last_Name",
    page: 1,
    per_page: 100,
    sort_by: "Created_Time",
    sort_order: "desc",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Contact ID" }],
  sample: { id: "contact-101" },
});
