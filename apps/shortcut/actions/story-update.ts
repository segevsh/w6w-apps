import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient, toStringList } from "../lib/client.ts";
import { storyIdParam, storyTypeOptions } from "../lib/params.ts";

interface Input {
  storyId: number;
  name?: string;
  description?: string;
  storyType?: string;
  workflowStateId?: number;
  epicId?: number;
  iterationId?: number;
  archived?: boolean;
  ownerIds?: string | string[];
  estimate?: number;
}

const storyUpdate: ActionDefinition<Input> = {
  key: "story-update",
  type: "perform",
  resource: "story",
  title: "Update Story",
  description: "Update an existing Story. Only the fields you set are changed — e.g. move it " +
    "to a new Workflow State by setting `workflowStateId` alone.",
  idempotent: true,
  params: [
    storyIdParam,
    { key: "name", label: "Name", type: "string", validation: { maxLength: 512 } },
    { key: "description", label: "Description", type: "text" },
    { key: "storyType", label: "Story type", type: "select", options: storyTypeOptions },
    {
      key: "workflowStateId",
      label: "Workflow State ID",
      type: "number",
      validation: { integer: true },
      hint: "From `workflow-list`. Setting this moves the Story to that state.",
    },
    { key: "epicId", label: "Epic ID", type: "number", validation: { integer: true } },
    { key: "iterationId", label: "Iteration ID", type: "number", validation: { integer: true } },
    { key: "archived", label: "Archived", type: "boolean" },
    { key: "ownerIds", label: "Owner Member UUIDs", type: "multiselect" },
    { key: "estimate", label: "Estimate (points)", type: "number", validation: { integer: true } },
  ],
  output: [{ key: "data", type: "object", label: "The updated Story" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).put(
      `/stories/${input.storyId}`,
      compact({
        name: input.name,
        description: input.description,
        story_type: input.storyType,
        workflow_state_id: input.workflowStateId,
        epic_id: input.epicId,
        iteration_id: input.iterationId,
        archived: input.archived,
        owner_ids: toStringList(input.ownerIds),
        estimate: input.estimate,
      }),
    );
  },
};

export default storyUpdate;
