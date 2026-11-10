import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

export default pollFromListAction({
  key: "new-call",
  title: "New Call",
  description: "The run gets each newly created call or meeting (with its summary and speakers).",
  action: callList,
  input: () => ({ page: 1, items: 100, order: "created_at desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  output: [
    { key: "uuid", type: "string", label: "Call UUID" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "performed_at", type: "string", label: "Performed at" },
  ],
  sample: {
    uuid: "3f2b9c1e-0000-4000-8000-000000000001",
    title: "Discovery call",
    created_at: "2026-11-10T09:00:00.000Z",
    performed_at: "2026-11-10T08:30:00.000Z",
  },
  maxPages: 1,
});
