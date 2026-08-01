import type { ActionDefinition } from "@w6w/types";
import { compact, PostHogClient, projectPath } from "../lib/client.ts";

/**
 * `GET /api/projects/{project_id}/feature_flags/` — verified against
 * PostHog's live OpenAPI schema 2026-08-01. Requires the
 * `feature_flag:read` scope.
 */
const action: ActionDefinition = {
  key: "feature-flag-list",
  type: "read",
  resource: "feature-flag",
  title: "List Feature Flags",
  description: "List feature flags defined in this PostHog project.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Matches key or name." },
    { key: "active", label: "Active only", type: "boolean" },
    { key: "archived", label: "Archived only", type: "boolean" },
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "count", type: "number", label: "Total count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "results", type: "array", label: "Feature flags" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new PostHogClient(ctx);
    return await client.request(projectPath(ctx.connection, "/feature_flags/"), {
      query: compact({
        search: p.search as string | undefined,
        active: p.active as boolean | undefined,
        archived: p.archived as boolean | undefined,
        limit: p.limit as number | undefined,
        offset: p.offset as number | undefined,
      }),
    });
  },
};

export default action;
