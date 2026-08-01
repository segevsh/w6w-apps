import type { ActionDefinition } from "@w6w/types";
import { circleciFetch, requireProjectSlug } from "../lib/client.ts";

/**
 * Trigger a new pipeline for a project.
 * `POST /project/{project-slug}/pipeline` —
 * https://circleci.com/docs/api/v2/#tag/Pipeline/operation/triggerPipeline
 *
 * The documented body accepts `branch` OR `tag` (mutually exclusive — both
 * select the revision to build) plus an optional `parameters` object of
 * pipeline parameters (defined in the project's `.circleci/config.yml`,
 * capped by the API at 100 entries / 128-char keys / 512-char values).
 * Omitting both `branch` and `tag` triggers the project's default branch.
 */
const action: ActionDefinition = {
  key: "pipeline-trigger",
  type: "perform",
  resource: "pipeline",
  title: "Trigger a pipeline",
  description: "Trigger a new pipeline for a project",
  idempotent: false,
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
      key: "branch",
      label: "Branch",
      type: "string",
      default: "",
      hint:
        "Branch to build. Mutually exclusive with Tag. Defaults to the project's default branch.",
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      default: "",
      hint: "Tag to build. Mutually exclusive with Branch.",
    },
    {
      key: "parameters",
      label: "Pipeline Parameters",
      type: "json",
      hint:
        'Object of pipeline parameters declared in .circleci/config.yml, e.g. { "deploy": true }',
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectSlug = requireProjectSlug(p.projectSlug);
    const branch = String(p.branch ?? "").trim();
    const tag = String(p.tag ?? "").trim();
    if (branch && tag) throw new Error("`branch` and `tag` are mutually exclusive");

    const body: Record<string, unknown> = {};
    if (branch) body.branch = branch;
    if (tag) body.tag = tag;
    if (p.parameters && typeof p.parameters === "object") body.parameters = p.parameters;

    ctx.log("info", "triggering CircleCI pipeline", {
      projectSlug,
      branch: branch || undefined,
      tag: tag || undefined,
    });

    return await circleciFetch(ctx, `/project/${projectSlug}/pipeline`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  },
};

export default action;
