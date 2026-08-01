import type { ActionDefinition } from "@w6w/types";
import { JenkinsClient } from "../lib/client.ts";

interface Input {
  queueId: number;
}

/**
 * `GET /queue/item/<id>/api/json` — resolves a queue item created by
 * `trigger-build`. While the item is waiting for an executor, `executable` is
 * absent and `why` explains the wait (e.g. "Waiting for next available
 * executor"); once Jenkins schedules it, `executable` carries the build's
 * `number` and `url` and the item leaves the queue shortly after (a stale
 * item id then 404s — the caller should treat that as "already built" and
 * fall back to `get-build-status`).
 */
const getQueueItem: ActionDefinition<Input> = {
  key: "get-queue-item",
  type: "read",
  resource: "queue",
  title: "Get Queue Item",
  description: "Get the status of a queued build — its wait reason, or the build it resolved to.",
  params: [
    {
      key: "queueId",
      label: "Queue Item ID",
      type: "number",
      required: true,
      hint: "The `queueId` returned by Trigger Build.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Queue item ID" },
    { key: "blocked", type: "boolean", label: "Blocked" },
    { key: "buildable", type: "boolean", label: "Waiting for an executor" },
    { key: "cancelled", type: "boolean", label: "Cancelled" },
    { key: "why", type: "string", label: "Human-readable wait reason" },
    { key: "executable", type: "object", label: "Resolved build (number, url) once scheduled" },
  ],

  execute(input, ctx) {
    const client = JenkinsClient.fromConnection(ctx);
    return client.getJson(`/queue/item/${encodeURIComponent(String(input.queueId))}/api/json`);
  },
};

export default getQueueItem;
