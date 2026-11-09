import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "time-entry-created",
  title: "Time Entry Created",
  description:
    "Fires when a time entry is created in a Toggl Track workspace, including a timer start. The run gets the time entry and who created it.",
  entity: "time_entry",
  action: "created",
});
