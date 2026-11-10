import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import inferenceModelList from "../actions/inference-model-list.ts";

/**
 * Shape (c): `GET router.huggingface.co/v1/models` answers the whole router catalogue in one
 * response (no order, no paging) and the router serves only models some inference provider has
 * deployed, a few hundred, so it is diffed with `pollSnapshot` rather than an id window that could
 * be smaller than the catalogue.
 */
export default {
  key: "new-inference-model",
  title: "New Inference Model",
  description: "The run gets each model newly available from the inference router.",
  output: [{ key: "id", type: "string", label: "Model ID" }],
  sample: { id: "org/model", providers: [{ provider: "provider" }] },
  minIntervalMs: 300_000,
  async poll({ state }, ctx: HookContext) {
    const res = await inferenceModelList.execute({}, ctx) as { models?: Array<{ id?: unknown }> };
    const { events, nextState } = await pollSnapshot({
      state,
      rows: (res.models ?? []).map((m) => ({ key: String(m.id ?? ""), values: m })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
} satisfies TriggerDefinition;
