import { pollFromListAction } from "../../_shared/poll/mod.ts";
import activityList from "../actions/activity-list.ts";
export default pollFromListAction({
  key: "new-activity",
  title: "New Activity",
  description: "The run gets each newly recorded organization activity.",
  action: activityList,
  input: (p: { fromDate: string }) => ({ fromDate: p.fromDate }),
  params: [{ key: "fromDate", label: "Since", type: "datetime", required: true }],
  items: (r) => (r as { activities?: unknown[] }).activities ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Activity ID" }],
  sample: { id: "activity-1" },
  maxPages: 1,
});
