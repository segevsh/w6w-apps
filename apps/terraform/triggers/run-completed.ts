import { webhookTrigger } from "../lib/triggers.ts";

/** A run completes successfully (notification trigger `run:completed`). */
const runCompleted = webhookTrigger({
  key: "run-completed",
  title: "Run Completed",
  description:
    "Fires when a run in an HCP Terraform or Terraform Enterprise workspace completes successfully (notification trigger run:completed). The run gets the run id, URL, status, message and creator, the workspace id and name, and the organization.",
  triggers: ["run:completed"],
});

export default runCompleted;
