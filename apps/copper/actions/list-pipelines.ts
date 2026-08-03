import type { ActionDefinition } from "@w6w/types";
import { CopperClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /pipelines` — every Pipeline on the account, with its stages nested in.
 *
 * A genuine GET, unlike the record collections: Copper's metadata endpoints
 * (`/pipelines`, `/pipeline_stages`, `/activity_types`,
 * `/custom_field_definitions`, `/lead_statuses`, `/customer_sources`,
 * `/contact_types`, `/loss_reasons`, `/tags`) are plain unfiltered GETs, while
 * anything holding customer records is a POST to `/search`. Both shapes in one
 * API is exactly why the search quirk is worth calling out.
 *
 * The response nests `stages`, so this one call is usually enough to build a
 * pipeline/stage picker — List Pipeline Stages exists for when you want the flat
 * list or the stages of one specific pipeline.
 *
 * `type` distinguishes "opportunity", "project" and "item" pipelines; only the
 * first is what Opportunities move through.
 */
const listPipelines: ActionDefinition<Input> = {
  key: "list-pipelines",
  type: "search",
  resource: "pipeline",
  title: "List Pipelines",
  description:
    "List every Pipeline on the account, each with its stages nested in. A plain GET — Copper's " +
    "metadata endpoints are not search endpoints.",
  params: [],
  output: [{ key: "pipelines", type: "array", label: "Pipelines" }],

  async execute(_input, ctx) {
    const pipelines = await new CopperClient(ctx).request<unknown[]>("/pipelines");
    return { pipelines: pipelines ?? [] };
  },
};

export default listPipelines;
