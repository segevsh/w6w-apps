import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/topic-list-latest.ts";

export default pollFromListAction({
  key: "new-topic",
  title: "New Topic",
  description: "The run gets each newly created topic on the forum.",
  action,
  input: (params) => ({ ...params, order: "created", ascending: false, perPage: 100 }),
  items: (result) => (result as { topic_list?: { topics?: unknown[] } }).topic_list?.topics ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  params: action.params,
  output: [{ key: "id", type: "number", label: "Topic ID" }],
  sample: { id: 123, title: "Welcome", created_at: "2026-11-09T00:00:00.000Z" },
  maxPages: 1,
});
