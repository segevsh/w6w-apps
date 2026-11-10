import { pollFromListAction } from "../../_shared/poll/mod.ts";
import activityList from "../actions/activity-list.ts";

export default pollFromListAction({
  key: "new-activity",
  title: "New Activity",
  description: "The run gets each new time-tracking activity.",
  action: activityList,
  input: () => ({ orderBy: "createdAt desc", top: 100, skip: 0 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Activity ID" }],
  sample: { id: "activity-1", name: "Development" },
  maxPages: 1,
});
