import type { ActionDefinition } from "@w6w/types";
import { BigQueryClient, resolveProject } from "../lib/client.ts";
import { PROJECT_PARAM } from "../lib/params.ts";

/**
 * `DELETE /projects/{projectId}/datasets/{datasetId}` — verified against
 * BigQuery's discovery document (`datasets.delete`).
 *
 * **`deleteContents` is the dangerous flag.** Without it BigQuery refuses to
 * delete a dataset that still has tables — which is the safe default and is
 * kept. With it, every table goes too, with no undo beyond time travel.
 *
 * The dataset is deliberately **not** defaulted from the connection: falling
 * back to a default here would let a blank field delete the connection's main
 * dataset.
 */
const action: ActionDefinition = {
  key: "dataset-delete",
  type: "perform",
  resource: "dataset",
  title: "Delete a dataset",
  description: "Delete a dataset, optionally with all of its tables.",
  idempotent: true,
  params: [
    PROJECT_PARAM,
    {
      key: "datasetId",
      label: "Dataset ID",
      type: "string",
      required: true,
      default: "",
      hint: "Named explicitly — this action does not fall back to the connection's default.",
    },
    {
      key: "deleteContents",
      label: "Delete Contents",
      type: "boolean",
      default: false,
      hint: "Required to delete a dataset that still has tables. Every table goes with it.",
    },
  ],
  output: [
    { key: "datasetId", type: "string", label: "Dataset ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = resolveProject(ctx.connection, p.projectId);
    // Deliberately not `resolveDataset` — a blank field must not resolve to the
    // connection's default and delete the wrong thing.
    const datasetId = String(p.datasetId ?? "").trim();
    if (!datasetId) throw new Error("`datasetId` is required");

    ctx.log("info", "deleting a BigQuery dataset", {
      project,
      datasetId,
      deleteContents: p.deleteContents === true,
    });

    await new BigQueryClient(ctx).request(
      `/projects/${encodeURIComponent(project)}/datasets/${encodeURIComponent(datasetId)}`,
      {
        method: "DELETE",
        query: { deleteContents: p.deleteContents === true ? "true" : undefined },
      },
    );
    return { datasetId, deleted: true };
  },
};

export default action;
