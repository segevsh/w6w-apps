import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import pipelinesList from "../actions/pipelines-list.ts";

/**
 * Snapshot poll (brief 9.1 c). `GET /crm/v1/pipelines` is unpaged and the vendor limits the number of
 * pipelines by tariff plan (https://api.sendpulse.com/.well-known/openapi/crm.yaml, `createPipeline`),
 * so the whole collection comes back in one request.
 */
const trigger: TriggerDefinition = {
  key: "new-pipeline",
  title: "New Pipeline",
  description: "The run gets each CRM pipeline newly created in the account.",
  output: [
    { key: "id", type: "number", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 1201, name: "Sales" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await pipelinesList.execute({}, ctx) as { data?: Array<Record<string, unknown>> };
    const { events, nextState } = await pollSnapshot({
      state,
      emit: { added: true, updated: false },
      rows: (res.data ?? []).map((p) => ({ key: String(p.id), values: p })),
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
