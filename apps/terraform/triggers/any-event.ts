import { eventTrigger, RUN_TRIGGERS, WORKSPACE_TRIGGERS } from "../lib/triggers.ts";

/** Every notification trigger (run, health-assessment and workspace), or the subset `triggers` names. */
const anyEvent = eventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any HCP Terraform or Terraform Enterprise workspace notification: every run lifecycle trigger plus drift, health-assessment failures, auto-destroy and workspace deletion. Pick them with the triggers param or leave it empty for all. The run gets the trigger and message, then either the run fields (run id, URL, status, creator) or the event details, with the workspace and organization.",
  catalog: [...RUN_TRIGGERS, ...WORKSPACE_TRIGGERS],
  kind: "any",
  output: [
    { key: "trigger", type: "string", label: "Trigger (e.g. run:completed)" },
    { key: "message", type: "string", label: "Message" },
    { key: "workspaceName", type: "string", label: "Workspace name" },
    { key: "organizationName", type: "string", label: "Organization name" },
    { key: "notificationConfigurationId", type: "string", label: "Notification configuration ID" },
    { key: "runId", type: "string", label: "Run ID (run triggers)" },
    { key: "runUrl", type: "string", label: "Run URL (run triggers)" },
    { key: "runStatus", type: "string", label: "Run status (run triggers)" },
    { key: "details", type: "object", label: "Event details (workspace and assessment triggers)" },
  ],
  sample: {
    trigger: "run:completed",
    message: "Run Completed",
    runStatus: "applied",
    runId: "run-FwnENkvDnrpyFC7M",
    runUrl: "https://app.terraform.io/app/acme-org/my-workspace/runs/run-FwnENkvDnrpyFC7M",
    workspaceName: "my-workspace",
    organizationName: "acme-org",
    notificationConfigurationId: "nc-AeUQ2zfKZzW9TiGZ",
  },
});

export default anyEvent;
