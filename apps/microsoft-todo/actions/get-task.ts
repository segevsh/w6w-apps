import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, taskPath } from "../lib/client.ts";
import { expandParam, selectParam, taskListParam, taskOutput, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /me/todo/lists/{todoTaskListId}/tasks/{todoTaskId}`
 * https://learn.microsoft.com/en-us/graph/api/todotask-get?view=graph-rest-1.0
 *
 * One task. `$expand=checklistItems,linkedResources` is the reason to reach for
 * this over the entry already in a List Tasks page: the navigation properties
 * come back inline instead of costing a call each.
 *
 * Least privileged permission: `Tasks.Read`.
 */
const getTask: ActionDefinition<Input> = {
  key: "get-task",
  type: "read",
  resource: "task",
  title: "Get Task",
  description:
    "Read one task, optionally expanding its checklist items and linked resources inline.",
  params: [taskListParam, taskParam, selectParam(), expandParam()],
  output: taskOutput(),

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(taskPath(input.taskList, input.task), {
      query: { $select: odataList(input.select), $expand: odataList(input.expand) },
    });
  },
};

export default getTask;
