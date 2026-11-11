import { eventTrigger, WORKSPACE_TRIGGERS } from "../lib/triggers.ts";

/** Drift detection found drift (notification trigger `assessment:drifted`). */
const driftDetected = eventTrigger({
  key: "drift-detected",
  title: "Drift Detected",
  description:
    "Fires when HCP Terraform detects configuration drift in the workspace (notification trigger assessment:drifted; needs drift detection enabled on the workspace). The run gets the trigger, message, workspace and organization names and the assessment details.",
  catalog: WORKSPACE_TRIGGERS,
  fixed: ["assessment:drifted"],
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
    trigger: "assessment:drifted",
    triggerScope: "assessment",
    message: "Drift Detected",
    workspaceName: "my-workspace",
    organizationName: "acme-org",
    notificationConfigurationId: "nc-AeUQ2zfKZzW9TiGZ",
    details: {
      new_assessment_result: { id: "asmtres-sample", drifted: true, resources_drifted: 2 },
    },
  },
});

export default driftDetected;
