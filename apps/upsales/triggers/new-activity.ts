import activityList from "../actions/activity-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-activity",
  title: "New Activity",
  action: activityList,
  output: [{ key: "id", type: "number", label: "Activity ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
