import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "project-deleted",
  title: "Project Deleted",
  description: "The run gets each project deleted from the Clockify workspace.",
  webhookEvent: "PROJECT_DELETED",
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "clientId", type: "string", label: "Client ID" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "billable", type: "boolean", label: "Billable" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],
  sample: {
    id: "5b641568b07987035750505e",
    name: "Website redesign",
    clientId: "",
    workspaceId: "64a687e29ae1f428e7ebe303",
    billable: true,
    archived: false,
  },
});
