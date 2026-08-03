import type { ActionDefinition } from "@w6w/types";
import {
  CopperClient,
  SEARCH_OUTPUT,
  SEARCH_PARAMS,
  searchBody,
  type SearchInput,
  type SearchResult,
} from "../lib/client.ts";

interface Input extends SearchInput {
  ids?: number[] | null;
  assigneeIds?: number[] | null;
  opportunityIds?: number[] | null;
  projectIds?: number[] | null;
  statuses?: string[] | null;
  tags?: string[] | null;
  minimumDueDate?: number;
  maximumDueDate?: number;
  minimumModifiedDate?: number;
  maximumModifiedDate?: number;
}

/**
 * `POST /tasks/search` — list and filter Tasks.
 *
 * Note `statuses` (plural, strings) rather than a `status_ids` array: Tasks are
 * the one resource here whose search filter takes the same "Open" / "Completed"
 * vocabulary as the record itself, with no numeric-id detour.
 *
 * `sort_by` defaults to `due_date` for this resource — another reminder that
 * Copper's default sort varies per endpoint and is worth setting explicitly.
 */
const searchTasks: ActionDefinition<Input> = {
  key: "search-tasks",
  type: "search",
  resource: "task",
  title: "Search Tasks",
  description:
    "List and filter Tasks via `POST /tasks/search`. Status filters are the plain strings " +
    '"Open" / "Completed" — no numeric ids for this resource.',
  params: [
    { key: "ids", label: "Task IDs", type: "json", hint: "JSON array of specific Task ids." },
    {
      key: "assigneeIds",
      label: "Assignee IDs",
      type: "json",
      hint: "JSON array of User ids, or `[-2]` for Tasks with no owner.",
    },
    { key: "opportunityIds", label: "Opportunity IDs", type: "json", hint: "JSON array." },
    {
      key: "projectIds",
      label: "Project IDs",
      type: "json",
      hint: "JSON array, or `[-2]` for Tasks with no project.",
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      options: [
        { value: "Open", label: "Open" },
        { value: "Completed", label: "Completed" },
      ],
    },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array; matches at least one." },
    {
      key: "minimumDueDate",
      label: "Due after",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "maximumDueDate",
      label: "Due before",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "minimumModifiedDate",
      label: "Modified after",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "maximumModifiedDate",
      label: "Modified before",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    ...SEARCH_PARAMS,
  ],
  output: SEARCH_OUTPUT,

  execute(input, ctx): Promise<SearchResult> {
    return new CopperClient(ctx).search(
      "/tasks/search",
      searchBody(input, {
        ids: input.ids ?? undefined,
        assignee_ids: input.assigneeIds ?? undefined,
        opportunity_ids: input.opportunityIds ?? undefined,
        project_ids: input.projectIds ?? undefined,
        statuses: input.statuses ?? undefined,
        tags: input.tags ?? undefined,
        minimum_due_date: input.minimumDueDate,
        maximum_due_date: input.maximumDueDate,
        minimum_modified_date: input.minimumModifiedDate,
        maximum_modified_date: input.maximumModifiedDate,
      }),
    );
  },
};

export default searchTasks;
