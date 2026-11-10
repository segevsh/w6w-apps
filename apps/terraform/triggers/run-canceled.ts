import { webhookTrigger } from "../lib/triggers.ts";

/** A run is canceled (notification trigger `run:run_canceled`). */
const runCanceled = webhookTrigger({
  key: "run-canceled",
  title: "Run Canceled",
  description:
    "Fires when a run is canceled in an HCP Terraform or Terraform Enterprise workspace (notification trigger run:run_canceled). The run gets the run id, URL, status, message and creator, the workspace id and name, and the organization.",
  triggers: ["run:run_canceled"],
  sample: { trigger: "run:run_canceled", message: "Run Canceled", runStatus: "canceled" },
});

export default runCanceled;
