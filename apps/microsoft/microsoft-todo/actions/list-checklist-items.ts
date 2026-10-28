import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, taskPath } from "../lib/client.ts";
import { pagedOutput, pagingParams, selectParam, taskListParam, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
  select?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/todo/lists/{todoTaskListId}/tasks/{todoTaskId}/checklistItems`
 * https://learn.microsoft.com/en-us/graph/api/todotask-list-checklistitems?view=graph-rest-1.0
 *
 * A `checklistItem` is To Do's subtask: a title plus a checkbox, nothing more
 * (`displayName`, `isChecked`, `checkedDateTime`, `createdDateTime`). It has no
 * due date, no assignee and no nesting of its own, which is worth knowing before
 * modelling a hierarchy on it.
 *
 * Get Task with `$expand=checklistItems` returns the same data in one call —
 * this action exists for the case where the task is already in hand.
 *
 * Least privileged permission: `Tasks.Read`.
 */
const listChecklistItems: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-checklist-items",
  type: "read",
  resource: "checklist-item",
  title: "List Checklist Items",
  description: "List a task's checklist items (subtasks).",
  params: [taskListParam, taskParam, selectParam(), ...pagingParams()],
  output: pagedOutput("Checklist items"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const options = { query: { $select: odataList(input.select), $top: input.top } };
    const target = input.nextLink ?? `${taskPath(input.taskList, input.task)}/checklistItems`;
    const opts = input.nextLink ? {} : options;
    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listChecklistItems;
