import { webhookTrigger } from "../lib/triggers.ts";

/** A run is waiting for a person to approve its apply (notification trigger `run:pending_apply_approval`). */
const runPendingApplyApproval = webhookTrigger({
  key: "run-pending-apply-approval",
  title: "Run Pending Apply Approval",
  description:
    "Fires when a run is waiting for a person to approve its apply in an HCP Terraform or Terraform Enterprise workspace (notification trigger run:pending_apply_approval). The run gets the run id, URL, status, message and creator, the workspace id and name, and the organization.",
  triggers: ["run:pending_apply_approval"],
  sample: {
    trigger: "run:pending_apply_approval",
    message: "Run Pending Apply Approval",
    runStatus: "planned",
  },
});

export default runPendingApplyApproval;
