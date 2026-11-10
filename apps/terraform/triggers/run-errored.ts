import { webhookTrigger } from "../lib/triggers.ts";

/** A run terminates early, by error or cancellation (notification trigger `run:errored`). */
const runErrored = webhookTrigger({
  key: "run-errored",
  title: "Run Errored",
  description:
    "Fires when a run in an HCP Terraform or Terraform Enterprise workspace terminates early (notification trigger run:errored). The run gets the run id, URL, status, message and creator, the workspace id and name, and the organization.",
  triggers: ["run:errored"],
  sample: { trigger: "run:errored", message: "Run Errored", runStatus: "errored" },
});

export default runErrored;
