import type { ActionDefinition } from "@w6w/types";
import { compact, SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `POST /api/0/organizations/{org}/projects/` — verified against Sentry's
 * OpenAPI schema (`createOrganizationProject`; scopes `project:admin` / `project:read` / `project:write`, body
 * requires `name`).
 *
 * Note the team: Sentry's own docs route project creation through a team
 * (`POST /teams/{org}/{team}/projects/`), but the organization-level endpoint
 * in the current schema takes no team and is the one kept here — a project
 * created this way lands in the org and is assigned to a team afterwards in
 * Sentry's UI.
 */
const action: ActionDefinition = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create a project",
  description: "Create a new project in an organization.",
  // A second call with the same name creates a second project (Sentry
  // disambiguates the slug), so this must not be retried blindly.
  idempotent: false,
  params: [
    ORG_PARAM,
    { key: "name", label: "Name", type: "string", required: true, default: "" },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      default: "",
      hint: "Optional. Sentry derives one from the name when blank.",
    },
    {
      key: "platform",
      label: "Platform",
      type: "string",
      default: "",
      placeholder: "javascript-react",
      hint: "Sentry's platform identifier, e.g. `python`, `node`, `javascript-react`.",
    },
    {
      key: "defaultRules",
      label: "Create Default Alert Rules",
      type: "boolean",
      default: true,
      hint: "Sentry's `default_rules` — a starter issue-alert rule for the new project.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "name", type: "string", label: "Name" },
    { key: "platform", type: "string", label: "Platform" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "features", type: "array", label: "Features" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    const body = compact({
      name,
      slug: p.slug,
      platform: p.platform,
      default_rules: typeof p.defaultRules === "boolean" ? p.defaultRules : undefined,
    });

    ctx.log("info", "creating Sentry project", { org, name });

    return await client.request(`/organizations/${encodeURIComponent(org)}/projects/`, {
      method: "POST",
      body,
    });
  },
};

export default action;
