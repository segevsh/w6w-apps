import type { ActionDefinition } from "@w6w/types";
import { HoneyBookClient, toList } from "../lib/client.ts";

interface Input {
  page?: number;
  perPage?: number;
  stageIds?: string[] | string;
  userIds?: string[] | string;
  viewId?: string;
  group?: string;
  category?: string;
  tagIds?: string[] | string;
  projectTypeIds?: string[] | string;
  leadSourceIds?: string[] | string;
  archived?: boolean;
  untracked?: boolean;
  hasSuggestion?: boolean;
  sort?: string;
}

const pipelineList: ActionDefinition<Input> = {
  key: "pipeline-list",
  type: "read",
  resource: "pipeline",
  title: "List Pipeline",
  description: "List the caller company's pipeline (workspaces by stage). Company-scoped.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "1-indexed page number (default 1)." },
    { key: "perPage", label: "Page size", type: "number", hint: "Page size, 1-100 (default 25)." },
    {
      key: "stageIds",
      label: "Stage IDs",
      type: "multiselect",
      hint: "Pipeline stage ids to include.",
    },
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
    { key: "archived", label: "Archived", type: "boolean" },
    { key: "untracked", label: "Untracked", type: "boolean" },
    { key: "hasSuggestion", label: "Has suggestion", type: "boolean" },
    {
      key: "sort",
      label: "Sort",
      type: "string",
      hint:
        'Single key; "-" prefix = descending. One of stage_moved_at (default, descending), project_date, name, last_activity_at, created_at, stage, project_type, lead_source.',
    },
  ],
  output: [
    { key: "data", type: "array", label: "Data" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const result = await new HoneyBookClient(ctx).request("GET", `/pipeline`, {
      query: {
        page: input.page,
        per_page: input.perPage,
        stage_ids: toList(input.stageIds),
        user_ids: toList(input.userIds),
        view_id: input.viewId,
        group: input.group,
        category: input.category,
        tag_ids: toList(input.tagIds),
        project_type_ids: toList(input.projectTypeIds),
        lead_source_ids: toList(input.leadSourceIds),
        archived: input.archived,
        untracked: input.untracked,
        has_suggestion: input.hasSuggestion,
        sort: input.sort,
      },
    });
    return result;
  },
};

export default pipelineList;
