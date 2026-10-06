import type { ActionDefinition } from "@w6w/types";
import { encodeId, LinkupClient } from "../lib/client.ts";

const extractGet: ActionDefinition<{ id: string }, Record<string, unknown>> = {
  key: "extract-get",
  type: "read",
  resource: "extract",
  title: "Get Extract Task (Beta)",
  description:
    "Read one Extract task. When completed, `output.resultUrl` downloads the rows as NDJSON for 24 hours.",
  params: [{ key: "id", label: "Task id", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Task id" },
    { key: "status", type: "string", label: "pending, processing, completed or failed" },
    { key: "error", type: "string", label: "Failure message, if failed" },
    { key: "output", type: "object", label: "creditsUsed, resultUrl, rowsReturned" },
    { key: "task", type: "object", label: "The task as returned by Linkup" },
  ],

  async execute(input, ctx) {
    const task = await new LinkupClient(ctx).get<Record<string, unknown>>(
      `/v1/extract/${encodeId(input.id)}`,
    );
    return { id: task?.id, status: task?.status, error: task?.error, output: task?.output, task };
  },
};

export default extractGet;
