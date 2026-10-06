import type { ActionDefinition } from "@w6w/types";
import { encodeId, TavilyClient } from "../lib/client.ts";

/**
 * `GET /research/{request_id}` — status and result of a research task.
 *
 * The three states arrive on different HTTP statuses: 202 for `pending` /
 * `in_progress`, 200 for `completed` or `failed`. The action treats all of them
 * as a successful read and returns the body, whose `status` field is the thing
 * to branch on; only 404 (unknown task) and the 4xx/5xx family throw.
 */
interface Input {
  requestId: string;
}

const researchGet: ActionDefinition<Input> = {
  key: "research-get",
  type: "read",
  resource: "research",
  title: "Get Research Task",
  description:
    "Get a research task's status (pending, in_progress, completed, failed) and, once completed, its report and sources.",
  params: [
    {
      key: "requestId",
      label: "Request ID",
      type: "string",
      required: true,
      hint: "The request_id returned by Start Research Task.",
    },
  ],
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "content", type: "object", label: "Report (string, or object when a schema was given)" },
    { key: "sources", type: "array", label: "Sources" },
  ],

  execute(input, ctx) {
    return new TavilyClient(ctx).json(`/research/${encodeId(input.requestId)}`);
  },
};

export default researchGet;
