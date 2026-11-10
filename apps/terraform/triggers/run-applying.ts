import { webhookTrigger } from "../lib/triggers.ts";

/** A run starts its apply (notification trigger `run:applying`). */
const runApplying = webhookTrigger({
  key: "run-applying",
  title: "Run Applying",
  description:
    "Fires when a run starts its apply in an HCP Terraform or Terraform Enterprise workspace (notification trigger run:applying). The run gets the run id, URL, status, message and creator, the workspace id and name, and the organization.",
  triggers: ["run:applying"],
  sample: { trigger: "run:applying", message: "Run Applying", runStatus: "applying" },
});

export default runApplying;
