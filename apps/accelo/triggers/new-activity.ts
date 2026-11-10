import { pollFromListAction } from "../../_shared/poll/mod.ts";
import activityList from "../actions/activity-list.ts";

export default pollFromListAction({
  key: "new-activity",
  title: "New Activity",
  description: "The run gets each newly created activity.",
  action: activityList,
  input: () => ({ orderBy: "id", orderDirection: "desc", limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Activity ID" }, {
    key: "subject",
    type: "string",
    label: "Subject",
  }],
  sample: { id: "101", subject: "Call with client" },
  maxPages: 1,
});
