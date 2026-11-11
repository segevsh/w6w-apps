import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "project-updated",
  title: "Project Updated",
  description: "The run gets each project edited in the Clockify workspace.",
  webhookEvent: "PROJECT_UPDATED",
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
