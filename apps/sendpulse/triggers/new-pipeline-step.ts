import type { Param } from "@w6w/types";
import pipelineStepsList from "../actions/pipeline-steps-list.ts";
import { dataOf, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c) of one pipeline the user picks. `GET /crm/v1/pipelines/{pipelineId}/steps`
 * is unpaged: a pipeline's stages come back whole in one request
 * (https://api.sendpulse.com/.well-known/openapi/crm.yaml, `/pipelines/{pipelineId}/steps`).
 */
export default snapshotTrigger<{ pipelineId: number }>({
  key: "new-pipeline-step",
  title: "New Pipeline Step",
  description: "The run gets each step (stage) newly added to the selected CRM pipeline.",
  params: (pipelineStepsList.params ?? []) as Param[],
  output: [
    { key: "id", type: "number", label: "Step ID" },
    { key: "pipelineId", type: "number", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "order", type: "number", label: "Position" },
  ],
  sample: { id: 1301, pipelineId: 1201, name: "Qualified", order: 2 },
  rows: async (p, ctx) =>
    dataOf(await pipelineStepsList.execute({ pipelineId: p.pipelineId }, ctx)),
  idOf: (r) => String(r.id),
});
