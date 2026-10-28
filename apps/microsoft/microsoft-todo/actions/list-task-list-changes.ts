import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { continuationParams, deltaOutput, selectParam } from "../lib/params.ts";

interface Input {
  deltaLink?: string;
  select?: string[];
  maxPageSize?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/todo/lists/delta`
 * https://learn.microsoft.com/en-us/graph/api/todotasklist-delta?view=graph-rest-1.0
 *
 * Change tracking for the task-list collection: which lists were added, renamed
 * or removed since last time, instead of re-reading all of them.
 *
 * **How a round works**, because getting this wrong quietly re-reads everything
 * forever:
 *
 *  1. First run — leave *Delta link* empty. Graph returns a page plus either an
 *     `@odata.nextLink` (round still going) or an `@odata.deltaLink` (round
 *     done).
 *  2. Store the `deltaLink` this action returns.
 *  3. Next run — pass it back as *Delta link*. Only what changed comes back.
 *
 * Graph encodes any query parameters into the token, so `Select fields` and
 * `Max page size` are honoured on the *first* call of a round and ignored (as
 * already-baked-in) on the continuations. That is why they are only applied when
 * no link is supplied.
 *
 * Least privileged permission for delta: `Tasks.ReadWrite` — note this is
 * *higher* than the plain `GET /me/todo/lists`, which needs only `Tasks.Read`.
 * This App holds `Tasks.ReadWrite`, so it is covered.
 */
const listTaskListChanges: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-task-list-changes",
  type: "read",
  resource: "task-list",
  title: "List Task List Changes",
  description:
    "Track additions, updates and deletions to the user's To Do lists using Graph delta query.",
  params: [
    {
      key: "deltaLink",
      label: "Delta link",
      type: "string",
      hint:
        "The `@odata.deltaLink` returned by the previous run. Leave empty for the first run, which reads the current state and opens the first round.",
    },
    selectParam(
      "OData `$select`. Applied on the first call of a round only — Graph bakes it into the state token. `id` is always returned.",
    ),
    {
      key: "maxPageSize",
      label: "Max page size",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 999 },
      hint:
        "Sent as `Prefer: odata.maxpagesize=…`, the only page-size control the delta functions document. Applied on the first call of a round only.",
    },
    ...continuationParams(),
  ],
  output: deltaOutput("Changed task lists"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const resume = input.nextLink ?? input.deltaLink;
    const target = resume ?? "/me/todo/lists/delta";
    // A resumed link already carries every parameter from the round that
    // produced it; re-sending them is at best redundant and at worst a 400.
    const opts = resume ? {} : {
      query: { $select: odataList(input.select) },
      headers: input.maxPageSize ? { prefer: `odata.maxpagesize=${input.maxPageSize}` } : undefined,
    };
    return input.all
      ? client.collect(target, opts, input.maxPages ?? 10)
      : client.page(target, opts);
  },
};

export default listTaskListChanges;
