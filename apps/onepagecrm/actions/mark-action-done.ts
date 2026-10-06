import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";

interface Input {
  actionId: string;
}

/** `PUT /actions/{action_id}/mark_as_done` — completes the action. */
const markActionDone: ActionDefinition<Input> = {
  key: "mark-action-done",
  type: "perform",
  resource: "action",
  title: "Mark Next Action Done",
  description: "Mark a next action as complete.",
  idempotent: true,
  params: [{ key: "actionId", label: "Action ID", type: "string", required: true }],
  output: [{ key: "action", type: "object", label: "The completed action" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data(
      `/actions/${encodeId(input.actionId)}/mark_as_done`,
      { method: "PUT" },
    );
  },
};

export default markActionDone;
