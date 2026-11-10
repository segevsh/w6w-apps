import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each contact that is created or edited in Bigin, most recently modified first.",
  action: action as never,
  input: () => ({
    fields: "id,First_Name,Last_Name,Email,Created_Time,Modified_Time",
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
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "First_Name", type: "string", label: "First name" },
    { key: "Last_Name", type: "string", label: "Last name" },
    { key: "Email", type: "string", label: "Email" },
    { key: "Created_Time", type: "string", label: "Created time" },
    { key: "Modified_Time", type: "string", label: "Modified time" },
  ],
  sample: {
    id: "5725767000000428001",
    First_Name: "Ada",
    Last_Name: "Lovelace",
    Email: "ada@example.com",
    Created_Time: "2026-11-09T12:00:00+00:00",
    Modified_Time: "2026-11-09T12:00:00+00:00",
  },
});
