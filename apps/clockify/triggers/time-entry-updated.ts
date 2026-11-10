import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "time-entry-updated",
  title: "Time Entry Updated",
  description: "The run gets each time entry edited in the Clockify workspace.",
  webhookEvent: "TIME_ENTRY_UPDATED",
  output: [
    { key: "id", type: "string", label: "Time entry ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "userId", type: "string", label: "User ID" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "billable", type: "boolean", label: "Billable" },
    { key: "timeInterval", type: "object", label: "Time interval (start, end, duration)" },
  ],
  sample: {
    id: "5b715448b0798751107918ab",
    description: "Writing docs",
    userId: "5a0ab5acb07987125438b60f",
    projectId: "5b641568b07987035750505e",
    workspaceId: "64a687e29ae1f428e7ebe303",
    billable: true,
    timeInterval: { start: "2026-11-09T12:00:00Z", end: "2026-11-09T13:00:00Z", duration: "PT1H" },
  },
});
