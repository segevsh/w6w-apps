import { webhookTrigger } from "../lib/triggers.ts";

/** Any run notification trigger, or the subset the `triggers` param names. */
const runEvent = webhookTrigger({
  key: "run-event",
  title: "Run Event",
  description:
    "Fires on run lifecycle notifications in an HCP Terraform or Terraform Enterprise workspace: created, planning, needs attention, pending apply approval, cost estimated, policy override required, policies checked, applying, completed, errored, run errored, run canceled and policy soft failed. Pick them with the triggers param or leave it empty for all. The run gets the trigger, run id, URL, status, message and creator, the workspace id and name, and the organization.",
});

export default runEvent;
