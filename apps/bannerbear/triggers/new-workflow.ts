import type { ActionDefinition } from "@w6w/types";
import workflowList from "../actions/workflow-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-workflow",
  title: "New Workflow",
  description:
    "The run gets each newly created workflow, polled newest-first through workflow-list.",
  action: workflowList as unknown as ActionDefinition,
  sample: { uid: "wf_001", name: "Resize and caption", created_at: "2026-11-09T10:00:00.000Z" },
});
