import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

export default pollFromListAction({
  key: "new-or-updated-call",
  title: "New or Updated Call",
  description: "The run gets each call or meeting that is newly created or updated.",
  action: callList,
  input: () => ({ page: 1, items: 100, order: "updated_at desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const c = item as { uuid?: unknown; updated_at?: unknown };
    return `${String(c.uuid ?? "")}:${String(c.updated_at ?? "")}`;
  },
  output: [
    { key: "uuid", type: "string", label: "Call UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    uuid: "3f2b9c1e-0000-4000-8000-000000000001",
    title: "Discovery call",
    updated_at: "2026-11-10T10:00:00.000Z",
  },
  maxPages: 1,
});
