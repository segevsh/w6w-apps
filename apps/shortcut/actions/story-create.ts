import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient, toStringList } from "../lib/client.ts";
import { storyTypeOptions } from "../lib/params.ts";

/**
 * `POST /api/v3/stories` — create a Story. Only `name` is required.
 *
 * `epicId`, `iterationId`, `projectId`, `groupId` and `workflowStateId` are all
 * plain integers except `groupId`, which is a UUID — see `lib/client.ts` for
 * why the id spaces don't line up across this API.
 */
interface Input {
  name: string;
  description?: string;
  storyType?: string;
  workflowStateId?: number;
  epicId?: number;
  iterationId?: number;
  projectId?: number;
  groupId?: string;
  ownerIds?: string | string[];
  followerIds?: string | string[];
  requestedById?: string;
  estimate?: number;
  deadline?: string;
  externalId?: string;
}

const storyCreate: ActionDefinition<Input> = {
  key: "story-create",
  type: "perform",
  resource: "story",
  title: "Create Story",
  description: "Create a new Story.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 512 } },
    { key: "description", label: "Description", type: "text" },
    { key: "storyType", label: "Story type", type: "select", options: storyTypeOptions },
    {
      key: "workflowStateId",
      label: "Workflow State ID",
      type: "number",
      validation: { integer: true },
      hint: "From `workflow-list` — the state this Story starts in. Leave empty for the " +
        "workflow's default starting state.",
    },
    { key: "epicId", label: "Epic ID", type: "number", validation: { integer: true } },
    { key: "iterationId", label: "Iteration ID", type: "number", validation: { integer: true } },
    { key: "projectId", label: "Project ID", type: "number", validation: { integer: true } },
    {
      key: "groupId",
      label: "Group UUID",
      type: "string",
      hint: "A Group's UUID — not the same id space as a Project's numeric `teamId`.",
    },
    { key: "ownerIds", label: "Owner Member UUIDs", type: "multiselect" },
    { key: "followerIds", label: "Follower Member UUIDs", type: "multiselect" },
    { key: "requestedById", label: "Requested by (Member UUID)", type: "string" },
    { key: "estimate", label: "Estimate (points)", type: "number", validation: { integer: true } },
    { key: "deadline", label: "Deadline", type: "datetime" },
    { key: "externalId", label: "External ID", type: "string", validation: { maxLength: 1024 } },
  ],
  output: [{ key: "data", type: "object", label: "The created Story" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).post(
      "/stories",
      compact({
        name: input.name,
        description: input.description,
        story_type: input.storyType,
        workflow_state_id: input.workflowStateId,
        epic_id: input.epicId,
        iteration_id: input.iterationId,
        project_id: input.projectId,
        group_id: input.groupId,
        owner_ids: toStringList(input.ownerIds),
        follower_ids: toStringList(input.followerIds),
        requested_by_id: input.requestedById,
        estimate: input.estimate,
        deadline: input.deadline,
        external_id: input.externalId,
      }),
    );
  },
};

export default storyCreate;
