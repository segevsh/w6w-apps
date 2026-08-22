import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { ORG_PARAM, PROJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/projects/{org}/{project}/` — verified against Sentry's OpenAPI
 * schema (`getProject`; scopes `project:read`).
 */
const action: ActionDefinition = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get a project",
  description: "Retrieve one project's settings and metadata.",
  params: [ORG_PARAM, PROJECT_PARAM],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "platform", type: "string", label: "Platform" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "isBookmarked", type: "boolean", label: "Bookmarked" },
    { key: "features", type: "array", label: "Features" },
    { key: "firstEvent", type: "string", label: "First event at" },
    { key: "organization", type: "object", label: "Organization" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const project = String(p.projectSlug ?? "").trim();
    if (!project) throw new Error("`projectSlug` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "getting Sentry project", { org, project });

    return await client.request(
      `/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/`,
    );
  },
};

export default action;
