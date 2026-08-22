import type { ActionDefinition } from "@w6w/types";
import { SentryClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /api/0/organizations/{org}/releases/{version}/` — verified against
 * Sentry's OpenAPI schema (`getOrganizationRelease`).
 *
 * The version goes in the PATH, so it is percent-encoded: Sentry versions are
 * routinely commit SHAs, `myapp@1.2.3`, or a path-like string, and an
 * unencoded `/` would silently address a different endpoint.
 */
const action: ActionDefinition = {
  key: "release-get",
  type: "read",
  resource: "release",
  title: "Get a release",
  description: "Retrieve one release by version identifier.",
  params: [
    ORG_PARAM,
    {
      key: "version",
      label: "Version",
      type: "string",
      required: true,
      default: "",
      placeholder: "myapp@1.2.3",
    },
    {
      key: "health",
      label: "Include Health Data",
      type: "boolean",
      default: false,
      hint: "Sentry's `health` flag — session/crash-free data alongside the release.",
    },
    {
      key: "project",
      label: "Project ID or Slug",
      type: "string",
      default: "",
      hint: "Required by Sentry when Include Health Data is on.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Release ID" },
    { key: "version", type: "string", label: "Version" },
    { key: "shortVersion", type: "string", label: "Short version" },
    { key: "ref", type: "string", label: "Ref" },
    { key: "url", type: "string", label: "URL" },
    { key: "dateCreated", type: "string", label: "Created at" },
    { key: "dateReleased", type: "string", label: "Released at" },
    { key: "projects", type: "array", label: "Projects" },
    { key: "lastDeploy", type: "object", label: "Last deploy" },
    { key: "lastCommit", type: "object", label: "Last commit" },
    { key: "commitCount", type: "number", label: "Commit count" },
    { key: "authors", type: "array", label: "Authors" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const version = String(p.version ?? "").trim();
    if (!version) throw new Error("`version` is required");

    const client = SentryClient.fromConnection(ctx);
    const org = SentryClient.orgFrom(ctx, p.organizationSlug);
    ctx.log("info", "getting Sentry release", { org, version });

    return await client.request(
      `/organizations/${encodeURIComponent(org)}/releases/${encodeURIComponent(version)}/`,
      {
        query: {
          health: p.health === true ? "true" : undefined,
          project: (p.project as string) || undefined,
        },
      },
    );
  },
};

export default action;
