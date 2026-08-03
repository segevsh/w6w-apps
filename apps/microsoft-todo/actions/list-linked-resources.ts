import type { ActionDefinition } from "@w6w/types";
import { GraphClient, type PagedResult, taskPath } from "../lib/client.ts";
import { continuationParams, pagedOutput, taskListParam, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET .../tasks/{todoTaskId}/linkedResources`
 * https://learn.microsoft.com/en-us/graph/api/todotask-list-linkedresources?view=graph-rest-1.0
 *
 * A `linkedResource` is the back-pointer To Do keeps to whatever created a task
 * — the email, the ticket, the row in someone's CRM. It is the single most
 * useful thing in this API for an integration, because it is where a workflow
 * stores "this task is *about* that record" (`externalId`) and gets a
 * clickable route home (`webUrl`) rendered in the task's detail pane.
 *
 * Least privileged permission: `Tasks.Read`.
 */
const listLinkedResources: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-linked-resources",
  type: "read",
  resource: "linked-resource",
  title: "List Linked Resources",
  description: "List the linked resources on a task — the records it was created from.",
  params: [taskListParam, taskParam, ...continuationParams()],
  output: pagedOutput("Linked resources"),

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const target = input.nextLink ?? `${taskPath(input.taskList, input.task)}/linkedResources`;
    return input.all ? client.collect(target, {}, input.maxPages ?? 10) : client.page(target, {});
  },
};

export default listLinkedResources;
