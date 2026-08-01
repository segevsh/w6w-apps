import type { ActionDefinition } from "@w6w/types";
import { compact, PostHogClient, projectPath } from "../lib/client.ts";

/**
 * `GET /api/projects/{project_id}/insights/` — verified against PostHog's
 * live OpenAPI schema 2026-08-01. Requires the `insight:read` scope.
 */
const action: ActionDefinition = {
  key: "insight-list",
  type: "read",
  resource: "insight",
  title: "List Insights",
  description: "List saved insights (trends, funnels, etc.) in this PostHog project.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Matches insight name." },
    { key: "saved", label: "Saved only", type: "boolean" },
    {
      key: "insight",
      label: "Insight Type",
      type: "select",
      hint: "Leave unset to include every type.",
      options: [
        { value: "TRENDS", label: "Trends" },
        { value: "FUNNELS", label: "Funnels" },
        { value: "RETENTION", label: "Retention" },
        { value: "PATHS", label: "Paths" },
        { value: "STICKINESS", label: "Stickiness" },
        { value: "LIFECYCLE", label: "Lifecycle" },
        { value: "SQL", label: "SQL" },
        { value: "JSON", label: "JSON" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "count", type: "number", label: "Total count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "results", type: "array", label: "Insights" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new PostHogClient(ctx);
    return await client.request(projectPath(ctx.connection, "/insights/"), {
      query: compact({
        search: p.search as string | undefined,
        saved: p.saved as boolean | undefined,
        insight: p.insight as string | undefined,
        limit: p.limit as number | undefined,
        offset: p.offset as number | undefined,
      }),
    });
  },
};

export default action;
