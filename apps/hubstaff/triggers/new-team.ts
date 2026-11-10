import { ORGANIZATION_ID_PARAM, snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/team-list.ts";

/** `GET /v2/organizations/{id}/teams`. */
export default snapshotFeed({
  key: "new-team",
  title: "New Team",
  description: "The run gets each team newly created in a Hubstaff organization.",
  action,
  params: [ORGANIZATION_ID_PARAM],
  input: ({ params, cursor, pageSize }) => ({
    organization_id: params.organizationId,
    page_limit: pageSize,
    page_start_id: cursor,
  }),
  items: (result) => (result as { teams?: Array<Record<string, unknown>> }).teams ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 77, name: "Support", created_at: "2026-11-09T10:00:00Z" },
});
