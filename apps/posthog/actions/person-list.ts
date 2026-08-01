import type { ActionDefinition } from "@w6w/types";
import { compact, PostHogClient, projectPath } from "../lib/client.ts";

/**
 * `GET /api/projects/{project_id}/persons/` — verified against PostHog's
 * live OpenAPI schema (`GET https://us.posthog.com/api/schema/`) 2026-08-01.
 * Requires the `person:read` scope.
 */
const action: ActionDefinition = {
  key: "person-list",
  type: "read",
  resource: "person",
  title: "List Persons",
  description: "List persons (users) tracked in this PostHog project.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches name, email or distinct id.",
    },
    { key: "distinctId", label: "Distinct ID", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "count", type: "number", label: "Total count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "results", type: "array", label: "Persons" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new PostHogClient(ctx);
    return await client.request(projectPath(ctx.connection, "/persons/"), {
      query: compact({
        search: p.search as string | undefined,
        distinct_id: p.distinctId as string | undefined,
        email: p.email as string | undefined,
        limit: p.limit as number | undefined,
        offset: p.offset as number | undefined,
      }),
    });
  },
};

export default action;
