import { webhookTrigger } from "../lib/triggers.ts";

/** A GitHub Actions job changing state. */
const workflowJob = webhookTrigger({
  key: "workflow-job",
  title: "Workflow Job Event",
  description:
    "Fires when a GitHub Actions job is queued, starts or completes. The run gets the action and the job with its conclusion.",
  event: "workflow_job",
  hasActions: true,
  output: [
    { key: "payload.workflow_job", type: "object", label: "Workflow job" },
    { key: "payload.workflow_job.status", type: "string", label: "Status" },
    { key: "payload.workflow_job.conclusion", type: "string", label: "Conclusion" },
  ],
  samplePayload: {
    action: "completed",
    workflow_job: { id: 399444496, name: "build", status: "completed", conclusion: "success" },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default workflowJob;
