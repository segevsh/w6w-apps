import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  json,
  parentOf,
  resolveLocation,
  resolveProject,
  VertexClient,
} from "../lib/client.ts";
import { LOCATION_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/{parent}/batchPredictionJobs` — verified against the discovery
 * document (`projects.locations.batchPredictionJobs.create`). The body is a
 * `BatchPredictionJob`: `displayName`, `model`, `inputConfig`
 * (`instancesFormat` + `gcsSource.uris` | `bigquerySource.inputUri`) and
 * `outputConfig` (`predictionsFormat` + `gcsDestination.outputUriPrefix` |
 * `bigqueryDestination.outputUri`) are the required parts.
 *
 * The job reads and writes Cloud Storage / BigQuery as the Vertex AI service
 * agent (or `serviceAccount`), not as this connection, so those locations need
 * to grant it access.
 */
const action: ActionDefinition = {
  key: "batch-prediction-job-create",
  type: "perform",
  resource: "batch-prediction-job",
  title: "Create batch prediction job",
  description: "Start a batch prediction job over Cloud Storage or BigQuery input.",
  // Each call starts another job and bills for it; there is no request id.
  idempotent: false,
  params: [
    PROJECT_PARAM,
    LOCATION_PARAM,
    { key: "displayName", label: "Display name", type: "string", required: true },
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      placeholder: "publishers/google/models/gemini-2.5-flash",
      hint: "A model resource name, or a publisher model: `publishers/{publisher}/models/{model}`.",
    },
    {
      key: "instancesFormat",
      label: "Input format",
      type: "select",
      required: true,
      options: [
        { value: "jsonl", label: "jsonl (Cloud Storage)" },
        { value: "bigquery", label: "bigquery" },
      ],
    },
    {
      key: "inputUris",
      label: "Input URIs",
      type: "string",
      repeat: true,
      hint: "Cloud Storage URIs (gs://…) for jsonl input, or one `bq://project.dataset.table`.",
    },
    {
      key: "predictionsFormat",
      label: "Output format",
      type: "select",
      required: true,
      options: [
        { value: "jsonl", label: "jsonl (Cloud Storage)" },
        { value: "bigquery", label: "bigquery" },
      ],
    },
    {
      key: "outputUri",
      label: "Output URI",
      type: "string",
      required: true,
      hint: "A `gs://bucket/prefix/` directory, or `bq://project[.dataset.table]`.",
    },
    { key: "modelParameters", label: "Model parameters", type: "json" },
    { key: "labels", label: "Labels", type: "json", hint: "Object of string labels." },
    { key: "serviceAccount", label: "Service account", type: "string" },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "state", type: "string", label: "Job state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    const location = resolveLocation(ctx.connection, p.location);
    if (!String(p.displayName ?? "").trim()) throw new Error("`displayName` is required");

    const inputs = ((p.inputUris as unknown[] | undefined) ?? []).map((u) => String(u).trim())
      .filter(Boolean);
    if (inputs.length === 0) throw new Error("`inputUris` needs at least one URI");
    const inputConfig = p.instancesFormat === "bigquery"
      ? { instancesFormat: "bigquery", bigquerySource: { inputUri: inputs[0] } }
      : { instancesFormat: p.instancesFormat, gcsSource: { uris: inputs } };

    const outputUri = String(p.outputUri ?? "").trim();
    if (!outputUri) throw new Error("`outputUri` is required");
    const outputConfig = p.predictionsFormat === "bigquery"
      ? { predictionsFormat: "bigquery", bigqueryDestination: { outputUri } }
      : { predictionsFormat: p.predictionsFormat, gcsDestination: { outputUriPrefix: outputUri } };

    const body = compact({
      displayName: p.displayName,
      model: p.model,
      inputConfig,
      outputConfig,
      modelParameters: json(p.modelParameters, "modelParameters"),
      labels: json(p.labels, "labels"),
      serviceAccount: p.serviceAccount,
    });

    ctx.log("info", "creating Vertex AI batch prediction job", { project, location });
    return await new VertexClient(ctx).request(
      location,
      `${parentOf(project, location)}/batchPredictionJobs`,
      { method: "POST", body },
    );
  },
};

export default action;
