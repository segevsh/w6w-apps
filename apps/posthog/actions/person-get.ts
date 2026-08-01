import type { ActionDefinition } from "@w6w/types";
import { PostHogClient, projectPath } from "../lib/client.ts";

/**
 * `GET /api/projects/{project_id}/persons/{id}/` — verified against
 * PostHog's live OpenAPI schema 2026-08-01. `id` is the person's numeric id
 * or UUID, not a `distinct_id` (use `person-list`'s `distinctId` filter to
 * resolve one first). Requires the `person:read` scope.
 */
const action: ActionDefinition = {
  key: "person-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Retrieve a single person by id.",
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "uuid", type: "string", label: "UUID" },
    { key: "name", type: "string", label: "Name" },
    { key: "distinct_ids", type: "array", label: "Distinct IDs" },
    { key: "properties", type: "object", label: "Properties" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const personId = String(p.personId ?? "").trim();
    if (!personId) throw new Error("`personId` is required");
    const client = new PostHogClient(ctx);
    return await client.request(
      projectPath(ctx.connection, `/persons/${encodeURIComponent(personId)}/`),
    );
  },
};

export default action;
