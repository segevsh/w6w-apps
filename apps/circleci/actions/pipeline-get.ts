import type { ActionDefinition } from "@w6w/types";
import { circleciFetch, requireProjectSlug } from "../lib/client.ts";

/**
 * Get a single pipeline by its project-relative number.
 * `GET /project/{project-slug}/pipeline/{pipeline-number}` —
 * https://circleci.com/docs/api/v2/#tag/Pipeline/operation/getPipelineByNumber
 */
const action: ActionDefinition = {
  key: "pipeline-get",
  type: "read",
  resource: "pipeline",
  title: "Get a pipeline",
  description: "Get details for a single pipeline by its project-relative number",
  params: [
    {
      key: "projectSlug",
      label: "Project Slug",
      type: "string",
      required: true,
      default: "",
      placeholder: "gh/CircleCI-Public/api-preview-docs",
      hint: "vcs-slug/org-name/repo-name. vcs-slug is gh, bb, or circleci.",
    },
    {
      key: "pipelineNumber",
      label: "Pipeline Number",
      type: "number",
      required: true,
      hint: "The pipeline's project-relative number (shown in the CircleCI UI/URL)",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectSlug = requireProjectSlug(p.projectSlug);
    const pipelineNumber = Number(p.pipelineNumber);
    if (!Number.isFinite(pipelineNumber)) {
      throw new Error("`pipelineNumber` is required and must be a number");
    }

    ctx.log("info", "getting CircleCI pipeline", { projectSlug, pipelineNumber });

    return await circleciFetch(ctx, `/project/${projectSlug}/pipeline/${pipelineNumber}`);
  },
};

export default action;
