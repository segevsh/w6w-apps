import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

export default pollFromListAction({
  key: "new-call",
  title: "New Call",
  description: "The run gets each newly dispatched Bland call.",
  action: callList,
  input: () => ({ ascending: false, limit: 100 }),
  items: (result) => (result as { calls?: unknown[] }).calls ?? [],
  idOf: (item) =>
    String((item as { c_id?: unknown; id?: unknown }).c_id ?? (item as { id?: unknown }).id ?? ""),
  output: [{ key: "c_id", type: "string", label: "Call ID" }],
  sample: { c_id: "call_123" },
  maxPages: 1,
});
