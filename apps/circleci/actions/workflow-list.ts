import type { ActionDefinition } from "@w6w/types";
import { circleciFetch } from "../lib/client.ts";

/**
 * List the workflows that ran under a pipeline.
 * `GET /pipeline/{pipeline-id}/workflow` —
 * https://circleci.com/docs/api/v2/#tag/Pipeline/operation/listWorkflowsByPipelineId
 *
 * Takes the pipeline's UUID `id` (as returned by `pipeline-get` /
 * `pipeline-list` / `pipeline-trigger`), not its project-relative number.
 * Supports cursor pagination via `page-token`.
 */
const action: ActionDefinition = {
  key: "workflow-list",
  type: "read",
  resource: "workflow",
  title: "List a pipeline's workflows",
  description: "List the workflows that ran under a pipeline",
  params: [
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "string",
      required: true,
      default: "",
      hint: "The pipeline's UUID (the `id` field, not its number)",
    },
    {
      key: "pageToken",
      label: "Page Token",
      type: "string",
      default: "",
      hint: "Opaque cursor from a previous call's next_page_token",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pipelineId = String(p.pipelineId ?? "").trim();
    if (!pipelineId) throw new Error("`pipelineId` is required");

    const pageToken = String(p.pageToken ?? "").trim();
    const qs = new URLSearchParams();
    if (pageToken) qs.set("page-token", pageToken);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    ctx.log("info", "listing CircleCI pipeline workflows", { pipelineId });

    return await circleciFetch(
      ctx,
      `/pipeline/${encodeURIComponent(pipelineId)}/workflow${suffix}`,
    );
  },
};

export default action;
