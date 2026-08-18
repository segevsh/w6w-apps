import type { ActionDefinition } from "@w6w/types";
import { csv, MeilisearchClient } from "../lib/client.ts";
import { TASK_OUTPUT } from "../lib/params.ts";

/**
 * `POST /tasks/cancel` — verified against Meilisearch's OpenAPI document
 * (`cancel_tasks`).
 *
 * **Cancelling is itself a task**, which is the recursion worth knowing about:
 * this returns a `taskUid` for the cancellation, not for the thing cancelled.
 *
 * **A filter is required, and it is not optional in the ordinary way.**
 * Meilisearch refuses a cancel with no filter at all rather than cancelling
 * everything — a rare case of an API being careful on your behalf — but the
 * filters it does accept are broad: `statuses=enqueued` cancels every pending
 * write on the instance, across every index. Only `enqueued` and `processing`
 * tasks can be cancelled; a finished one is untouched.
 */
const action: ActionDefinition = {
  key: "task-cancel",
  type: "perform",
  resource: "task",
  title: "Cancel tasks",
  description: "Enqueue cancellation of pending tasks matching a filter.",
  idempotent: true,
  params: [
    {
      key: "uids",
      label: "Task IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. The narrowest and safest filter.",
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "string",
      default: "",
      placeholder: "enqueued",
      hint: "Only `enqueued` and `processing` can be cancelled. On its own this reaches EVERY " +
        "pending task on the instance.",
    },
    {
      key: "indexUids",
      label: "Indexes",
      type: "string",
      default: "",
      hint: "Comma-separated. Narrows a status filter to one index.",
    },
    {
      key: "types",
      label: "Types",
      type: "string",
      default: "",
      hint: "Comma-separated task types.",
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const query = {
      uids: csv(p.uids),
      statuses: csv(p.statuses),
      indexUids: csv(p.indexUids),
      types: csv(p.types),
    };
    if (!Object.values(query).some(Boolean)) {
      throw new Error(
        "a filter is required — name `uids`, or a `statuses`/`indexUids`/`types` combination",
      );
    }

    ctx.log("warn", "enqueueing a Meilisearch task cancellation", {
      filters: Object.entries(query).filter(([, v]) => v).map(([k]) => k),
    });

    return await new MeilisearchClient(ctx).request("/tasks/cancel", {
      method: "POST",
      query,
    });
  },
};

export default action;
