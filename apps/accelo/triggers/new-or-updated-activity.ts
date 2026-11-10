import { pollFromListAction } from "../../_shared/poll/mod.ts";
import activityList from "../actions/activity-list.ts";

export default pollFromListAction({
  key: "new-or-updated-activity",
  title: "New or Updated Activity",
  description: "The run gets each activity that is created or modified.",
  action: activityList,
  input: () => ({ orderBy: "date_modified", orderDirection: "desc", limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const a = item as { id?: unknown; date_modified?: unknown };
    return `${a.id ?? ""}:${a.date_modified ?? ""}`;
  },
  output: [
    { key: "id", type: "string", label: "Activity ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "date_modified", type: "string", label: "Modified (unix time)" },
  ],
  sample: { id: "101", subject: "Call with client", date_modified: "1700000000" },
  maxPages: 1,
});
