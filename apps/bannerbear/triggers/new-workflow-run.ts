import type { ActionDefinition } from "@w6w/types";
import workflowRunList from "../actions/workflow-run-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-workflow-run",
  title: "New Workflow Run",
  description:
    "The run gets each newly started workflow run, polled newest-first through workflow-run-list.",
  action: workflowRunList as unknown as ActionDefinition,
  sample: { uid: "wfrun_001", created_at: "2026-11-09T10:00:00.000Z" },
});
