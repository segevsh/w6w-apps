import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listModels from "../actions/list-models.ts";

// Snapshot of `GET /v1/models` (brief 9.1c): the Agent API model catalog is a short vendor-wide
// list (a few dozen entries, one request, no pagination), so the whole collection is one bounded
// response (https://docs.perplexity.ai/api-reference/models-get). Added only: a model already
// listed does not fire again.
const list: ActionDefinition = listModels as unknown as ActionDefinition;

const trigger: TriggerDefinition = {
  key: "new-model",
  title: "New Model Available",
  description: "The run gets each model newly added to the Perplexity Agent API model catalog.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Model ID" },
    { key: "values", type: "object", label: "Model (id, object, created, owned_by)" },
  ],
  sample: {
    change: "added",
    key: "perplexity/sonar",
    values: {
      id: "perplexity/sonar",
      object: "model",
      created: 1760000000,
      owned_by: "perplexity",
    },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await list.execute({}, ctx) as { data?: Array<{ id?: unknown }> };
    return await pollSnapshot({
      state,
      rows: (result.data ?? []).map((model) => ({ key: String(model.id ?? ""), values: model })),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
