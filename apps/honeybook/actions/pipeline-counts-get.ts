import type { ActionDefinition } from "@w6w/types";
import { HoneyBookClient, toList } from "../lib/client.ts";

interface Input {
  userIds?: string[] | string;
  viewId?: string;
  group?: string;
  category?: string;
  tagIds?: string[] | string;
  projectTypeIds?: string[] | string;
  leadSourceIds?: string[] | string;
}

const pipelineCountsGet: ActionDefinition<Input> = {
  key: "pipeline-counts-get",
  type: "read",
  resource: "pipeline",
  title: "Get Pipeline Counts",
  description:
    "Pipeline stage/category tallies for the caller's company. Company-wide active/archived/untracked totals, per-category tallies, and per-stage counts.",
  params: [
    {
      key: "userIds",
      label: "User IDs",
      type: "multiselect",
      hint:
        "Team-member user ids whose pipeline to show (default: the caller). Watching others requires moderator or above.",
    },
    {
      key: "viewId",
      label: "View ID",
      type: "string",
      hint: "Custom view id; resolves to the view's stage scope (overridden by stage ids).",
    },
    {
      key: "group",
      label: "Group",
      type: "select",
      options: [{ "value": "opportunities", "label": "Opportunities" }, {
        "value": "projects",
        "label": "Projects",
      }],
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: [{ "value": "lead", "label": "Lead" }, { "value": "booked", "label": "Booked" }, {
        "value": "other",
        "label": "Other",
      }],
    },
    { key: "tagIds", label: "Tag IDs", type: "multiselect", hint: "Workspace tag ids." },
    { key: "projectTypeIds", label: "Project type IDs", type: "multiselect" },
    { key: "leadSourceIds", label: "Lead source IDs", type: "multiselect" },
  ],
  output: [
    { key: "active_count", type: "number", label: "Active count" },
    { key: "archived_count", type: "number", label: "Archived count" },
    { key: "untracked_count", type: "number", label: "Untracked count" },
    { key: "categories", type: "array", label: "Categories" },
    { key: "stages", type: "array", label: "Stages" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request("GET", `/pipeline/counts`, {
      query: {
        user_ids: toList(input.userIds),
        view_id: input.viewId,
        group: input.group,
        category: input.category,
        tag_ids: toList(input.tagIds),
        project_type_ids: toList(input.projectTypeIds),
        lead_source_ids: toList(input.leadSourceIds),
      },
    });
    return result;
  },
};

export default pipelineCountsGet;
