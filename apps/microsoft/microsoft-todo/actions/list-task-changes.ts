import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, tasksPath } from "../lib/client.ts";
import {
  continuationParams,
  deltaOutput,
  expandParam,
  filterParam,
  orderByParam,
  selectParam,
  taskListParam,
} from "../lib/params.ts";

interface Input {
  taskList: string;
  deltaLink?: string;
  filter?: string;
  orderBy?: string;
  select?: string[];
  expand?: string[];
  top?: number;
  maxPageSize?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/todo/lists/{todoTaskListId}/tasks/delta`
 * https://learn.microsoft.com/en-us/graph/api/todotask-delta?view=graph-rest-1.0
 *
 * Change tracking for the tasks in one list — added, updated *and deleted*,
 * which is the part a `$filter=lastModifiedDateTime gt …` poll can never give
 * you: a deleted task simply stops appearing, whereas delta reports it.
 *
 * The round protocol is the same as List Task List Changes: leave *Delta link*
 * empty first, store the `deltaLink` that comes back, pass it in next time.
 *
 * **This is the one To Do endpoint where Microsoft is specific about OData**,
 * and the constraints are unusual enough to state rather than paraphrase:
 *
 *  - `$select`, `$top` and `$expand` are supported.
 *  - `$filter` supports **only** `receivedDateTime ge {value}` or
 *    `receivedDateTime gt {value}` — note `receivedDateTime` is not even a
 *    property of `todoTask`; it is an Outlook-item field showing through the
 *    shared backing store.
 *  - `$orderby` supports **only** `receivedDateTime desc`.
 *  - `$search` is not supported at all.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const listTaskChanges: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-task-changes",
  type: "read",
  resource: "task",
  title: "List Task Changes",
  description:
    "Track additions, updates and deletions to the tasks in one list using Graph delta query.",
  params: [
    taskListParam,
    {
      key: "deltaLink",
      label: "Delta link",
      type: "string",
      hint:
        "The `@odata.deltaLink` returned by the previous run. Leave empty for the first run, which reads the current state and opens the first round.",
    },
    filterParam(
      "OData `$filter`. The delta function documents exactly two supported expressions: `receivedDateTime ge {value}` and `receivedDateTime gt {value}`. Anything else is unsupported here even where List Tasks accepts it.",
    ),
    orderByParam(
      "OData `$orderby`. The only expression the delta function documents is `receivedDateTime desc`.",
    ),
    selectParam(
      "OData `$select` — explicitly supported by the delta function. `id` is always returned. Applied on the first call of a round only.",
    ),
    expandParam(),
    {
      key: "top",
      label: "Page size",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 999 },
      hint: "OData `$top` — explicitly supported by the delta function.",
    },
    {
      key: "maxPageSize",
      label: "Max page size",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 999 },
      hint: "Sent as `Prefer: odata.maxpagesize=…`, which the delta function also documents.",
    },
    ...continuationParams(),
  ],
  output: deltaOutput("Changed tasks"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const resume = input.nextLink ?? input.deltaLink;
    const target = resume ?? `${tasksPath(input.taskList)}/delta`;
    // A resumed link already carries every parameter from the round that
    // produced it; re-sending them is at best redundant and at worst a 400.
    const opts = resume ? {} : {
      query: {
        $filter: input.filter,
        $orderby: input.orderBy,
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
      },
      headers: input.maxPageSize ? { prefer: `odata.maxpagesize=${input.maxPageSize}` } : undefined,
    };
    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listTaskChanges;
