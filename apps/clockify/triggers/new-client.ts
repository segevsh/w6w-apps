import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "new-client",
  title: "New Client",
  description: "The run gets each client created in the Clockify workspace.",
  webhookEvent: "NEW_CLIENT",
  output: [
    { key: "id", type: "string", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],
  sample: {
    id: "5b715612b079875110791111",
    name: "Acme",
    workspaceId: "64a687e29ae1f428e7ebe303",
    archived: false,
  },
});
