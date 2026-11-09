import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listActivities from "../actions/list-activities.ts";

export default pollFromListAction<{ campaignId?: string }>({
  key: "new-activity",
  title: "New Activity",
  description: "The run gets each newly recorded lemlist campaign activity.",
  action: listActivities,
  input: (params) => ({ campaignId: params.campaignId, offset: 0, limit: 100, version: "v2" }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  params: [{ key: "campaignId", label: "Campaign ID", type: "string" }],
  output: [
    { key: "_id", type: "string", label: "Activity ID" },
    { key: "type", type: "string", label: "Activity type" },
  ],
  sample: { _id: "activity_123", type: "emailsReplied" },
});
