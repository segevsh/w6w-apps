import activityList from "../actions/activity-list.ts";
import { updatedListTrigger } from "../lib/list-trigger.ts";
export default updatedListTrigger({
  key: "new-or-updated-activity",
  title: "New or Updated Activity",
  noun: "activity",
  action: activityList,
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "modDate", type: "string", label: "Modified at" },
  ],
  sample: { id: 1, modDate: "2026-11-10T00:00:00Z" },
});
