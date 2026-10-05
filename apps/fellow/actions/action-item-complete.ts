import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  actionItemId: string;
  completed?: boolean;
  onBehalfOf?: string;
}

const actionItemComplete: ActionDefinition<Input> = {
  key: "action-item-complete",
  type: "perform",
  resource: "action-item",
  title: "Mark Action Item Complete",
  description: "Mark an action item complete, or incomplete again.",
  idempotent: true,
  params: [
    {
      key: "actionItemId",
      label: "Action item ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Action Items result.",
    },
    {
      key: "completed",
      label: "Completed",
      type: "boolean",
      default: true,
      hint: "true marks it done (default); false reopens it.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "id", type: "string", label: "Action item id" },
    { key: "text", type: "string", label: "Text" },
    { key: "status", type: "string", label: "Done, Archived or Incomplete" },
    { key: "due_date", type: "string", label: "Due date" },
    { key: "note_id", type: "string", label: "Note it belongs to" },
    { key: "assignees", type: "array", label: "Assignees" },
    { key: "updated_at", type: "string", label: "Last update" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).unwrap(
      "action_item",
      `/action_item/${encodeId(input.actionItemId)}/complete`,
      {
        method: "POST",
        body: { completed: input.completed !== false },
        onBehalfOf: input.onBehalfOf,
      },
    );
  },
};

export default actionItemComplete;
