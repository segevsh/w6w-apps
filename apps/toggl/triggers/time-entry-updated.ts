import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "time-entry-updated",
  title: "Time Entry Updated",
  description:
    "Fires when a time entry in a Toggl Track workspace is updated, including a timer stop. The run gets the updated time entry.",
  entity: "time_entry",
  action: "updated",
});
