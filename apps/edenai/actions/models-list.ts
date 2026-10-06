import type { ActionDefinition } from "@w6w/types";
import { EdenClient } from "../lib/client.ts";

/**
 * `GET /v3/models`.
 *
 * The route is PUBLIC (answers 200 with no key) and enormous: measured 2026-10-06, 1,156 entries
 * and 1.5 MB for the default view. Handing that to a workflow step would be a payload bomb, so
 * the filtering and the cut-off happen here and each entry is reduced to the fields a workflow
 * picks a model with. `view=endpoints` (the vendor default) is one row per `provider/model`;
 * `view=models` is one row per bare routable model name with its provider endpoints nested.
 */
interface Input {
  view?: string;
  search?: string;
  limit?: number;
}

interface Endpoint {
  id?: string;
  owned_by?: string;
  model_name?: string;
  context_length?: number | null;
  description?: string | null;
  capabilities?: { input_modalities?: string[]; output_modalities?: string[] };
  pricing?: { input_cost_per_token?: number; output_cost_per_token?: number };
}

interface Entry extends Endpoint {
  mode?: string;
  endpoints?: Endpoint[];
}

export const DEFAULT_LIMIT = 50;

export function slim(e: Entry): Record<string, unknown> {
  return {
    id: e.id,
    ownedBy: e.owned_by,
    mode: e.mode,
    contextLength: e.context_length ?? undefined,
    description: e.description ?? undefined,
    inputModalities: e.capabilities?.input_modalities,
    outputModalities: e.capabilities?.output_modalities,
    inputCostPerToken: e.pricing?.input_cost_per_token,
    outputCostPerToken: e.pricing?.output_cost_per_token,
    providerModels: e.endpoints?.map((x) => x.id),
  };
}

const modelsList: ActionDefinition<Input> = {
  key: "models-list",
  type: "search",
  resource: "llm",
  title: "List LLM Models",
  description:
    "List the LLM models available through Eden AI, with context length, modalities and token pricing.",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      default: "endpoints",
      options: [
        { value: "endpoints", label: "One row per provider/model" },
        { value: "models", label: "One row per routable model name" },
      ],
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Case-insensitive match on the model id or description.",
    },
    {
      key: "limit",
      label: "Max results",
      type: "number",
      default: DEFAULT_LIMIT,
      hint: "The vendor returns every model (over 1,000); this cuts the list after filtering.",
      validation: { min: 1, max: 1000, integer: true },
    },
  ],
  output: [
    { key: "models", type: "array", label: "Models" },
    { key: "count", type: "number", label: "Models returned" },
    { key: "totalMatched", type: "number", label: "Models matching before the cut-off" },
  ],

  async execute(input, ctx) {
    const res = await new EdenClient(ctx).json<{ data?: Entry[] }>("/models", {
      query: { view: input.view === "models" ? "models" : undefined },
    });
    const needle = (input.search ?? "").trim().toLowerCase();
    const all = (res.data ?? []).filter((e) =>
      !needle ||
      (e.id ?? "").toLowerCase().includes(needle) ||
      (e.description ?? "").toLowerCase().includes(needle)
    );
    const models = all.slice(0, input.limit ?? DEFAULT_LIMIT).map(slim);
    return { models, count: models.length, totalMatched: all.length };
  },
};

export default modelsList;
