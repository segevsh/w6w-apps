import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

export default pollFromListAction({
  key: "new-call",
  title: "New Call",
  description: "The run gets each newly concluded call.",
  action: callList,
  input: () => ({}),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; call_id?: unknown }).id ?? (item as { call_id?: unknown }).call_id ??
        "",
    ),
  output: [{ key: "id", type: "string", label: "Call ID" }],
  sample: { id: "call-1" },
  maxPages: 1,
});
