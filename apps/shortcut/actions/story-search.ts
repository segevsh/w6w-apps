import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient, toIntList, toStringList } from "../lib/client.ts";
import { storyTypeOptions, workflowStateTypeOptions } from "../lib/params.ts";

/**
 * `POST /api/v3/stories/search` — filter Stories by structured criteria
 * (as opposed to the free-text `search` action).
 *
 * This endpoint answers a **bare JSON array of `StorySlim`** with no pagination
 * of any kind — no `total`, no cursor. It is best suited to filters that are
 * expected to return a bounded set (a single Epic's open bugs, one Member's
 * started Stories); for anything that might match thousands of Stories, the
 * free-text `search` action's cursor-based paging is the safer tool.
 */
interface Input {
  storyType?: string;
  epicId?: number;
  epicIds?: string | number[];
  iterationId?: number;
  projectId?: number;
  labelName?: string;
  labelIds?: string | number[];
  ownerIds?: string | string[];
  requestedById?: string;
  groupId?: string;
  workflowStateId?: number;
  workflowStateTypes?: string | string[];
  archived?: boolean;
  includesDescription?: boolean;
  createdAtStart?: string;
  updatedAtStart?: string;
}

const storySearch: ActionDefinition<Input> = {
  key: "story-search",
  type: "search",
  resource: "story",
  title: "Search Stories (filter)",
  description: "Filter Stories by structured criteria such as Epic, Iteration, Label or owner.",
  params: [
    { key: "storyType", label: "Story type", type: "select", options: storyTypeOptions },
    { key: "epicId", label: "Epic ID", type: "number", validation: { integer: true } },
    { key: "epicIds", label: "Epic IDs", type: "multiselect" },
    { key: "iterationId", label: "Iteration ID", type: "number", validation: { integer: true } },
    { key: "projectId", label: "Project ID", type: "number", validation: { integer: true } },
    { key: "labelName", label: "Label name", type: "string" },
    { key: "labelIds", label: "Label IDs", type: "multiselect" },
    { key: "ownerIds", label: "Owner Member UUIDs", type: "multiselect" },
    { key: "requestedById", label: "Requested by (Member UUID)", type: "string" },
    { key: "groupId", label: "Group UUID", type: "string" },
    {
      key: "workflowStateId",
      label: "Workflow State ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "workflowStateTypes",
      label: "Workflow state types",
      type: "multiselect",
      options: workflowStateTypeOptions,
    },
    { key: "archived", label: "Archived", type: "boolean" },
    { key: "includesDescription", label: "Include description", type: "boolean" },
    {
      key: "createdAtStart",
      label: "Created on or after",
      type: "string",
      advanced: true,
      placeholder: "2026-11-09T12:00:00Z",
      hint: "ISO 8601 UTC date-time; sent as `created_at_start`.",
    },
    {
      key: "updatedAtStart",
      label: "Updated on or after",
      type: "string",
      advanced: true,
      placeholder: "2026-11-09T12:00:00Z",
      hint: "ISO 8601 UTC date-time; sent as `updated_at_start`.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Matching Stories" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).post(
      "/stories/search",
      compact({
        story_type: input.storyType,
        epic_id: input.epicId,
        epic_ids: toIntList(input.epicIds),
        iteration_id: input.iterationId,
        project_id: input.projectId,
        label_name: input.labelName,
        label_ids: toIntList(input.labelIds),
        owner_ids: toStringList(input.ownerIds),
        requested_by_id: input.requestedById,
        group_id: input.groupId,
        workflow_state_id: input.workflowStateId,
        workflow_state_types: toStringList(input.workflowStateTypes),
        archived: input.archived,
        includes_description: input.includesDescription,
        created_at_start: input.createdAtStart,
        updated_at_start: input.updatedAtStart,
      }),
    );
  },
};

export default storySearch;
