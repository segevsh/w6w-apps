import type { ActionDefinition } from "@w6w/types";
import { ConversionsClient, datasetFromConnection } from "../lib/client.ts";

interface Input {
  datasetId?: string;
  agentName?: string;
}

interface DatasetQuality {
  web?: unknown[];
  [key: string]: unknown;
}

/**
 * Dataset Quality API — `GET /dataset_quality?dataset_id={id}`.
 *
 * Note the shape: a **top-level** edge taking the dataset as a query parameter,
 * not `/{dataset-id}/quality`. Meta documents it inside the Conversions API
 * section as its companion read — the programmatic form of the Events Manager
 * quality panel: Event Match Quality (0–10), Additional Conversions Reported,
 * event coverage, deduplication rate, data freshness, and EMQ diagnostics.
 *
 * This is the action that closes the loop on hashing. A `user_data` payload
 * that is normalised wrongly does not error — it simply fails to match anyone,
 * and the only visible symptom is EMQ quietly sitting at 3 instead of 8. Being
 * able to read that from a workflow is the difference between a silent failure
 * and a monitorable one.
 *
 * Requires `ads_read` plus `ads_management` or `business_management`; a
 * dataset-scoped Events Manager token will generally not have them.
 */
const getDatasetQuality: ActionDefinition<Input, DatasetQuality> = {
  key: "get-dataset-quality",
  type: "read",
  resource: "dataset",
  title: "Get Dataset Quality",
  description:
    "Read Event Match Quality, event coverage, deduplication and freshness metrics for a dataset.",
  params: [
    {
      key: "datasetId",
      label: "Dataset (Pixel) ID",
      type: "string",
      hint: "Defaults to the dataset stored on the connection.",
    },
    {
      key: "agentName",
      label: "Partner Agent Name",
      type: "string",
      advanced: true,
      hint:
        "Normalised lowercase partner identifier. Platform partners use it to scope metrics to their own integration.",
    },
  ],
  output: [{ key: "web", type: "array", label: "Web event metrics" }],

  execute(input, ctx) {
    const datasetId = datasetFromConnection(ctx.connection, input.datasetId);
    const client = new ConversionsClient(ctx);
    return client.request<DatasetQuality>("/dataset_quality", {
      params: { dataset_id: datasetId, agent_name: input.agentName },
    });
  },
};

export default getDatasetQuality;
