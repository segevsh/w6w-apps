import { webhookTrigger } from "../lib/triggers.ts";

/** A GitHub Actions workflow run; `actions` narrows it (e.g. `completed`). */
const workflowRun = webhookTrigger({
  key: "workflow-run",
  title: "Workflow Run Event",
  description:
    "Fires when a GitHub Actions workflow run is requested, in progress or completed. The run gets the action and the workflow run, including its conclusion.",
  event: "workflow_run",
  hasActions: true,
  output: [
    { key: "payload.workflow_run", type: "object", label: "Workflow run" },
    { key: "payload.workflow_run.conclusion", type: "string", label: "Conclusion" },
    { key: "payload.workflow_run.html_url", type: "string", label: "URL" },
  ],
  samplePayload: {
    action: "completed",
    workflow_run: {
      id: 30433642,
      name: "Build",
      status: "completed",
      conclusion: "success",
      head_branch: "main",
      html_url: "https://github.com/octocat/Hello-World/actions/runs/30433642",
    },
    repository: { full_name: "octocat/Hello-World" },
    sender: { login: "octocat" },
  },
});

export default workflowRun;
