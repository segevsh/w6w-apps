import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, taskPath } from "../lib/client.ts";
import { taskListParam, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
  applicationName: string;
  displayName?: string;
  externalId?: string;
  webUrl?: string;
}

/**
 * `POST .../tasks/{todoTaskId}/linkedResources`
 * https://learn.microsoft.com/en-us/graph/api/todotask-post-linkedresources?view=graph-rest-1.0
 *
 * Attach a back-pointer to the record a task came from. This is the action that
 * makes a task created by a workflow traceable: `externalId` carries the id in
 * the originating system and `webUrl` gives the user a way back to it.
 *
 * **`webUrl` is genuinely optional**, and Microsoft says so explicitly: "Some
 * linkedResource objects are not associated with any web URLs, in which case,
 * the webUrl property is not required. For example, the linked item can be from
 * a custom business app or native platform app". So it is not marked required
 * here even though a link with no link looks odd — To Do renders both forms.
 *
 * Response is `201 Created`.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const createLinkedResource: ActionDefinition<Input> = {
  key: "create-linked-resource",
  type: "perform",
  resource: "linked-resource",
  title: "Create Linked Resource",
  description:
    "Link a task back to the record it came from, so the task shows where it originated.",
  // Graph mints a fresh id per call and does not deduplicate on externalId.
  idempotent: false,
  params: [
    taskListParam,
    taskParam,
    {
      key: "applicationName",
      label: "Application name",
      type: "string",
      required: true,
      placeholder: "Acme CRM",
      hint: "The name of the system the task came from. Shown in the task's detail pane.",
    },
    {
      key: "displayName",
      label: "Title",
      type: "string",
      hint: "The linked item's own title, e.g. the subject of the email or the name of the deal.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint:
        "The record's id in the originating system. This is the field to key on when reconciling later.",
    },
    {
      key: "webUrl",
      label: "Link",
      type: "string",
      hint:
        "Deep link back to the record. Optional by design — Microsoft documents linked resources from apps that have no web URL at all.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Linked resource ID" },
    { key: "applicationName", type: "string", label: "Application name" },
    { key: "displayName", type: "string", label: "Title" },
    { key: "externalId", type: "string", label: "External ID" },
    { key: "webUrl", type: "string", label: "Link" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(`${taskPath(input.taskList, input.task)}/linkedResources`, {
      method: "POST",
      body: compact({
        applicationName: input.applicationName,
        displayName: input.displayName,
        externalId: input.externalId,
        webUrl: input.webUrl,
      }),
    });
  },
};

export default createLinkedResource;
