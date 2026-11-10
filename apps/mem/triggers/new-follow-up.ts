import { pollFromListAction } from "../../_shared/poll/mod.ts";
import followUpList from "../actions/follow-up-list.ts";

export default pollFromListAction({
  key: "new-follow-up",
  title: "New Follow-up",
  description:
    "The run gets each newly created Mem follow-up, polled from the existing `follow-up-list` action with `order_by=created_at`.",
  action: followUpList,
  input: () => ({ page: "", limit: 100, order_by: "created_at" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Follow-up ID" },
    { key: "content", type: "string", label: "Follow-up text" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "fu-1",
    content: "Check in with Ada",
    status: "pending",
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
