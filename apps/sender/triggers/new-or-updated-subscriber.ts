import { pollFromListAction } from "../../_shared/poll/mod.ts";
import subscriberList from "../actions/subscriber-list.ts";

export default pollFromListAction({
  key: "new-or-updated-subscriber",
  title: "New or Updated Subscriber",
  description: "The run gets each newly created or updated subscriber.",
  action: subscriberList,
  input: () => ({ page: 1, limit: 100, order: "modified", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => {
    const subscriber = item as { id?: unknown; modified?: unknown };
    return `${subscriber.id ?? ""}:${subscriber.modified ?? ""}`;
  },
  output: [{ key: "id", type: "string", label: "Subscriber ID" }],
  sample: { id: "subscriber-1", modified: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
