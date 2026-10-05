import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  actionItemId: string;
  onBehalfOf?: string;
}

const actionItemGet: ActionDefinition<Input> = {
  key: "action-item-get",
  type: "read",
  resource: "action-item",
  title: "Get Action Item",
  description: "Retrieve one action item by id.",
  params: [
    {
      key: "actionItemId",
      label: "Action item ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Action Items result.",
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
      `/action_item/${encodeId(input.actionItemId)}`,
      {
        onBehalfOf: input.onBehalfOf,
      },
    );
  },
};

export default actionItemGet;
