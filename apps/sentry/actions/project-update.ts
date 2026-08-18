import type { ActionDefinition } from "@w6w/types";
import { compact, csv, SentryClient } from "../lib/client.ts";
import { ORG_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `PUT /api/0/projects/{org}/{project}/` — verified against Sentry's OpenAPI
 * schema (`updateProject`; scopes `project:admin` / `project:read` / `project:write`). Every body property is
 * optional; only the fields the caller set are sent.
 */
const action: ActionDefinition = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update a project",
  description: "Change a project's name, slug, platform, or issue-resolution settings.",
  idempotent: true,
  params: [
    ORG_PARAM,
    PROJECT_PARAM,
    { key: "name", label: "Name", type: "string", default: "" },
    { key: "slug", label: "Slug", type: "string", default: "" },
    { key: "platform", label: "Platform", type: "string", default: "" },
    {
      key: "resolveAge",
      label: "Auto-Resolve After (hours)",
      type: "number",
      default: null,
      hint: "Auto-resolve an issue that has not been seen for this many hours. 0 disables it.",
    },
    {
      key: "highlightTags",
      label: "Highlight Tags",
      type: "string",
      default: "",
      hint: "Comma-separated tag keys to highlight on this project's issues.",
    },
    { key: "isBookmarked", label: "Bookmarked", type: "boolean", default: null },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "platform", type: "string", label: "Platform" },
    { key: "isBookmarked", type: "boolean", label: "Bookmarked" },
    { key: "features", type: "array", label: "Features" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.projectSlug ?? "").trim();
    if (!project) throw new Error("`projectSlug` is required");

    const body = compact({
      name: p.name,
      slug: p.slug,
      platform: p.platform,
      resolveAge: typeof p.resolveAge === "number" ? p.resolveAge : undefined,
      highlightTags: csv(p.highlightTags),
      isBookmarked: typeof p.isBookmarked === "boolean" ? p.isBookmarked : undefined,
    });
    // `resolveAge: 0` is meaningful (it turns auto-resolution off) and `compact`
    // keeps zeros, so nothing special is needed for it here.
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "updating Sentry project", { org, project, fields: Object.keys(body) });

    return await client.request(
      `/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/`,
      { method: "PUT", body },
    );
  },
};

export default action;
