import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";

/**
 * `GET /api/v3/workflows` — every Workflow, each with its own `states` array.
 *
 * A Story's `workflow_state_id` (used by `story-create`/`story-update`) must be
 * one of the ids inside a Workflow's `states` here — Shortcut does not validate
 * that a state id belongs to the Workflow the Project/Group in question
 * actually uses, so picking one from the wrong Workflow moves the Story into a
 * state that silently makes no sense in its own board.
 */
const workflowList: ActionDefinition<Record<string, never>> = {
  key: "workflow-list",
  type: "search",
  resource: "workflow",
  title: "List Workflows",
  description: "List every Workflow and its states.",
  params: [],
  output: [{ key: "data", type: "array", label: "Workflows" }],

  execute(_input, ctx) {
    return new ShortcutClient(ctx).get("/workflows");
  },
};

export default workflowList;
