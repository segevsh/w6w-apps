import { webhookTrigger } from "../lib/triggers.ts";

/** A plan has changes and Terraform needs input to continue (notification trigger `run:needs_attention`). */
const runNeedsAttention = webhookTrigger({
  key: "run-needs-attention",
  title: "Run Needs Attention",
  description:
    "Fires when a plan has changes and HCP Terraform or Terraform Enterprise needs a person to approve it or override a policy (notification trigger run:needs_attention). The run gets the run id, URL, status, message and creator, the workspace id and name, and the organization.",
  triggers: ["run:needs_attention"],
  sample: {
    trigger: "run:needs_attention",
    message: "Run Needs Attention",
    runStatus: "planned",
  },
});

export default runNeedsAttention;
