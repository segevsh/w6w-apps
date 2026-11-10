import { eventTrigger, WORKSPACE_TRIGGERS } from "../lib/triggers.ts";

/** A workspace is deleted (notification trigger `workspace:deleted`). */
const workspaceDeleted = eventTrigger({
  key: "workspace-deleted",
  title: "Workspace Deleted",
  description:
    "Fires when the HCP Terraform or Terraform Enterprise workspace is deleted (notification trigger workspace:deleted). The run gets the trigger, message, workspace and organization names and the event details.",
  catalog: WORKSPACE_TRIGGERS,
  fixed: ["workspace:deleted"],
  kind: "workspace",
  output: [
    { key: "trigger", type: "string", label: "Trigger (e.g. workspace:deleted)" },
    { key: "triggerScope", type: "string", label: "Scope (workspace or assessment)" },
    { key: "message", type: "string", label: "Message" },
    { key: "workspaceName", type: "string", label: "Workspace name" },
    { key: "organizationName", type: "string", label: "Organization name" },
    { key: "notificationConfigurationId", type: "string", label: "Notification configuration ID" },
    { key: "details", type: "object", label: "Event details" },
  ],
  sample: {
    trigger: "workspace:deleted",
    triggerScope: "workspace",
    message: "Workspace Deleted",
    workspaceName: "my-workspace",
    organizationName: "acme-org",
    notificationConfigurationId: "nc-AeUQ2zfKZzW9TiGZ",
    details: { workspace_name: "my-workspace", organization_name: "acme-org" },
  },
});

export default workspaceDeleted;
