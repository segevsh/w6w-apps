import type { ActionDefinition } from "@w6w/types";

import { API_BASE, applyQuery, sendJson } from "../lib/client.ts";

/**
 * `GET /deal_pipelines` — the pipelines and the stages inside them.
 *
 * `type: "read"`: it exists to resolve the `deal_stage_id`/`deal_pipeline_id`
 * values that List Deals and Create Deal expect, and it takes only `page`/`limit`.
 *
 * The response is a **bare JSON array** — unlike every other list in this API,
 * there is no `{ … , has_more, total }` envelope here. It is returned verbatim,
 * which is why this action's output describes the pipeline objects themselves
 * rather than a page wrapper.
 */
interface Input {
  page?: number;
  limit?: number;
}

const listDealPipelines: ActionDefinition<Input> = {
  key: "list-deal-pipelines",
  type: "read",
  resource: "deal",
  title: "List Deal Pipelines",
  description: "List the CRM's deal pipelines and their stages.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "limit",
      label: "Per page",
      type: "number",
      default: 20,
      hint: "The API's default is 20 and its maximum is 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Pipeline name" },
    { key: "deal_stages", type: "array", label: "Stages in the pipeline" },
  ],

  execute(input, ctx) {
    const url = new URL(`${API_BASE}/deal_pipelines`);
    applyQuery(url, { page: input.page, limit: input.limit });
    return sendJson(ctx, url);
  },
};

export default listDealPipelines;
