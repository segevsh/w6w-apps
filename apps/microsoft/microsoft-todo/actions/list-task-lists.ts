import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { pagedOutput, pagingParams, selectParam } from "../lib/params.ts";

interface Input {
  select?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/todo/lists`
 * https://learn.microsoft.com/en-us/graph/api/todo-list-lists?view=graph-rest-1.0
 *
 * Every other action in this App needs a task list id, and this is where one
 * comes from — so it is first in the manifest and it is the probe the Auth
 * `test` hook uses.
 *
 * Two things the reference documents that the hints carry:
 *
 *  - **`wellknownListName` is how you find the built-in lists.** `defaultList`
 *    is the "Tasks" list every mailbox has; `flaggedEmails` is the synthetic
 *    list of flagged mail. Both are undeletable and unrenamable, which is why
 *    Delete Task List and Update Task List will refuse them.
 *  - **Shared lists appear here too** (`isShared`, `isOwner`), so an empty-ish
 *    result is a permissions answer as much as a data one.
 *
 * Least privileged permission: `Tasks.Read`. This App holds `Tasks.ReadWrite`,
 * documented as its higher-privileged form.
 */
const listTaskLists: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-task-lists",
  type: "read",
  resource: "task-list",
  title: "List Task Lists",
  description:
    "List the signed-in user's To Do lists, including the built-in Tasks and Flagged email lists and any lists shared with them.",
  params: [selectParam(), ...pagingParams()],
  output: pagedOutput("Task lists"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const options = { query: { $select: odataList(input.select), $top: input.top } };
    const target = input.nextLink ?? "/me/todo/lists";
    const opts = input.nextLink ? {} : options;
    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listTaskLists;
