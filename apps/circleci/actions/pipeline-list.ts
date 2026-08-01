import type { ActionDefinition } from "@w6w/types";
import { circleciFetch, requireProjectSlug } from "../lib/client.ts";

/**
 * List the pipelines for a project.
 * `GET /project/{project-slug}/pipeline` —
 * https://circleci.com/docs/api/v2/#tag/Pipeline/operation/listPipelinesForProject
 *
 * Supports an optional `branch` filter and cursor pagination via
 * `page-token` (opaque, echoed back as `next_page_token` in the response).
 */
const action: ActionDefinition = {
  key: "pipeline-list",
  type: "read",
  resource: "pipeline",
  title: "List project pipelines",
  description: "List the pipelines for a project",
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
      hint: "Filter to pipelines for this vcs branch",
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
    const projectSlug = requireProjectSlug(p.projectSlug);
    const branch = String(p.branch ?? "").trim();
    const pageToken = String(p.pageToken ?? "").trim();

    const qs = new URLSearchParams();
    if (branch) qs.set("branch", branch);
    if (pageToken) qs.set("page-token", pageToken);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    ctx.log("info", "listing CircleCI pipelines", { projectSlug, branch: branch || undefined });

    return await circleciFetch(ctx, `/project/${projectSlug}/pipeline${suffix}`);
  },
};

export default action;
