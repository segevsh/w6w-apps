import type { ActionDefinition } from "@w6w/types";
import { compact, PostHogClient, projectPath } from "../lib/client.ts";

/**
 * `GET /api/projects/{project_id}/cohorts/` — verified against PostHog's
 * live OpenAPI schema 2026-08-01. Requires the `cohort:read` scope.
 */
const action: ActionDefinition = {
  key: "cohort-list",
  type: "read",
  resource: "cohort",
  title: "List Cohorts",
  description: "List saved cohorts (person segments) in this PostHog project.",
  params: [
    { key: "search", label: "Search", type: "string", hint: "Matches cohort name." },
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "count", type: "number", label: "Total count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "results", type: "array", label: "Cohorts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new PostHogClient(ctx);
    return await client.request(projectPath(ctx.connection, "/cohorts/"), {
      query: compact({
        search: p.search as string | undefined,
        limit: p.limit as number | undefined,
        offset: p.offset as number | undefined,
      }),
    });
  },
};

export default action;
