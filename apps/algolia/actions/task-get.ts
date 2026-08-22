import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `GET /1/indexes/{indexName}/task/{taskID}` — verified against Algolia's
 * OpenAPI document (`getTask`; answers `{ status }`).
 *
 * **This is the action that makes the write actions usable.** Every Algolia
 * write is asynchronous: the write returns a `taskID` immediately, and the
 * change is not searchable until that task reports `published`. A workflow that
 * writes and then searches without waiting will miss its own write.
 *
 * `status` is `notPublished` while pending and `published` when done. This
 * action reports the status once; a workflow polls it (or sleeps) rather than
 * the action blocking, because an action that waited would hold a step open for
 * an unbounded time.
 */
const action: ActionDefinition = {
  key: "task-get",
  type: "read",
  resource: "task",
  title: "Get a task's status",
  description: "Check whether an asynchronous write has been published yet.",
  params: [
    INDEX_PARAM,
    {
      key: "taskID",
      label: "Task ID",
      type: "string",
      required: true,
      default: "",
      hint: "The `taskID` returned by any write action.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "published or notPublished" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    const taskID = String(p.taskID ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    if (!taskID) throw new Error("`taskID` is required");

    ctx.log("info", "getting Algolia task status", { indexName, taskID });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/task/${encodeURIComponent(taskID)}`,
      { read: true },
    );
  },
};

export default action;
