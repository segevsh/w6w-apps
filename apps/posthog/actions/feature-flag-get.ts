import type { ActionDefinition } from "@w6w/types";
import { PostHogClient, projectPath } from "../lib/client.ts";

/**
 * `GET /api/projects/{project_id}/feature_flags/{id}/` — verified against
 * PostHog's live OpenAPI schema 2026-08-01. `id` is the flag's numeric id
 * (not its string `key`) — use `feature-flag-list`'s `search` filter to
 * resolve one first. Requires the `feature_flag:read` scope.
 */
const action: ActionDefinition = {
  key: "feature-flag-get",
  type: "read",
  resource: "feature-flag",
  title: "Get Feature Flag",
  description: "Retrieve a single feature flag by id.",
  params: [
    { key: "flagId", label: "Feature Flag ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Flag ID" },
    { key: "key", type: "string", label: "Key" },
    { key: "name", type: "string", label: "Name" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "filters", type: "object", label: "Filters (targeting rules)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const flagId = String(p.flagId ?? "").trim();
    if (!flagId) throw new Error("`flagId` is required");
    const client = new PostHogClient(ctx);
    return await client.request(
      projectPath(ctx.connection, `/feature_flags/${encodeURIComponent(flagId)}/`),
    );
  },
};

export default action;
