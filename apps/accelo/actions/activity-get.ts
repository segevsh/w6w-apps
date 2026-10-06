import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "activity-get",
  resource: "activity",
  path: "/activities",
  idKey: "activityId",
  idLabel: "Activity ID",
  title: "Get Activity",
  description: "Fetch one activity by id.",
});
