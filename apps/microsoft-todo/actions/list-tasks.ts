import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, tasksPath } from "../lib/client.ts";
import {
  expandParam,
  filterParam,
  orderByParam,
  pagedOutput,
  pagingParams,
  selectParam,
  taskListParam,
} from "../lib/params.ts";

interface Input {
  taskList: string;
  filter?: string;
  orderBy?: string;
  select?: string[];
  expand?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/todo/lists/{todoTaskListId}/tasks`
 * https://learn.microsoft.com/en-us/graph/api/todotasklist-list-tasks?view=graph-rest-1.0
 *
 * The tasks in one list. Note what this endpoint is **not**: there is no
 * cross-list "all my tasks" call in the To Do API — `/me/todo/tasks` does not
 * exist. Fanning out over List Task Lists is the supported shape, and doing it
 * in the workflow rather than hiding it in one action keeps the request count
 * visible.
 *
 * `$filter` is offered because it is the only way to ask for "open tasks" or
 * "due this week" without dragging the whole list across, but the hint says
 * plainly that Microsoft documents To Do as supporting "some of the OData query
 * parameters" without enumerating them. The expressions in the hint are the
 * ones built from properties the `todoTask` reference actually defines.
 *
 * Least privileged permission: `Tasks.Read`.
 */
const listTasks: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-tasks",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description:
    "List the tasks in one To Do list. There is no cross-list endpoint — call this once per list.",
  params: [
    taskListParam,
    filterParam(
      "OData `$filter` over `todoTask` properties, e.g. `status ne 'completed'` or `dueDateTime/dateTime lt '2026-09-01T00:00:00'`. Microsoft does not enumerate which OData parameters To Do supports, so treat this as best-effort.",
    ),
    orderByParam(
      "OData `$orderby`, e.g. `dueDateTime/dateTime asc` or `lastModifiedDateTime desc`. Without one the return order is not guaranteed.",
    ),
    selectParam(),
    expandParam(),
    ...pagingParams(),
  ],
  output: pagedOutput("Tasks"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $filter: input.filter,
        $orderby: input.orderBy,
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
      },
    };
    const target = input.nextLink ?? tasksPath(input.taskList);
    const opts = input.nextLink ? {} : options;
    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listTasks;
