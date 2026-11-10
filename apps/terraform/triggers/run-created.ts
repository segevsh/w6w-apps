import { webhookTrigger } from "../lib/triggers.ts";

/** A run is created (notification trigger `run:created`). */
const runCreated = webhookTrigger({
  key: "run-created",
  title: "Run Created",
  description:
    "Fires when a run is created in an HCP Terraform or Terraform Enterprise workspace (notification trigger run:created). The run gets the run id, URL, status, message and creator, the workspace id and name, and the organization.",
  triggers: ["run:created"],
  sample: { trigger: "run:created", message: "Run Created", runStatus: "pending" },
});

export default runCreated;
