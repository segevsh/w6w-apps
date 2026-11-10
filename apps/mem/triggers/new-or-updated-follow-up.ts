import { pollFromListAction } from "../../_shared/poll/mod.ts";
import followUpList from "../actions/follow-up-list.ts";

export default pollFromListAction({
  key: "new-or-updated-follow-up",
  title: "New or Updated Follow-up",
  description:
    "The run gets each Mem follow-up that was created or updated since the last check, polled from the existing `follow-up-list` action with `order_by=updated_at` (newest-updated first).",
  action: followUpList,
  input: () => ({ page: "", limit: 100, order_by: "updated_at" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const r = item as { id?: unknown; updated_at?: unknown };
    return `${String(r.id ?? "")}:${String(r.updated_at ?? "")}`;
  },
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
    updated_at: "2026-11-09T11:00:00Z",
  },
  maxPages: 1,
});
