import { pollFromListAction } from "../../_shared/poll/mod.ts";
import subscriberList from "../actions/subscriber-list.ts";

export default pollFromListAction({
  key: "new-subscriber",
  title: "New Subscriber",
  description: "The run gets each newly created subscriber.",
  action: subscriberList,
  input: () => ({ page: 1, limit: 100, order: "created", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Subscriber ID" }],
  sample: { id: "subscriber-1" },
  maxPages: 1,
});
