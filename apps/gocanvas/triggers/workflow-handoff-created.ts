import { webhookTrigger } from "../lib/triggers.ts";

/** A submission is handed off to the next user in a workflow (event type `workflow_handoff_create`). */
const workflowHandoffCreated = webhookTrigger({
  key: "workflow-handoff-created",
  title: "Workflow Handoff",
  description:
    "Fires when a submission is handed off to the next user in a workflow (event type workflow_handoff_create), for one form or company-wide; Workflow has to be enabled on the form. The run gets the event type, the form id and the delivery payload as GoCanvas sent it.",
  eventType: "workflow_handoff_create",
  sample: {
    eventType: "workflow_handoff_create",
    formId: "346127",
    payload: {},
  },
});

export default workflowHandoffCreated;
