import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/deals/pipelines/` — List deal pipelines with their stages.
 */
interface Input {
  page?: number;
}

const pipelineList: ActionDefinition<Input, unknown> = {
  key: "pipeline-list",
  type: "read",
  resource: "pipeline",
  title: "List Deal Pipelines",
  description: "List deal pipelines with their stages.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number; Clientify returns at most 100 results per page.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "count", type: "number", label: "Total matches" },
    { key: "next", type: "string", label: "URL of the next page, or null" },
    { key: "previous", type: "string", label: "URL of the previous page, or null" },
    { key: "results", type: "array", label: "Records on this page" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/deals/pipelines/`, { method: "GET", query: { "page": input.page } });
  },
};

export default pipelineList;
