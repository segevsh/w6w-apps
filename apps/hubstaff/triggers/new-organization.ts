import { snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/organization-list.ts";

/** `GET /v2/organizations` — the organizations the connected member is an active member of. */
export default snapshotFeed({
  key: "new-organization",
  title: "New Organization",
  description: "The run gets each Hubstaff organization the connected member newly joins.",
  action,
  input: ({ cursor, pageSize }) => ({ page_limit: pageSize, page_start_id: cursor }),
  items: (result) =>
    (result as { organizations?: Array<Record<string, unknown>> }).organizations ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Organization ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 123456, name: "Acme", status: "active", created_at: "2026-11-09T10:00:00Z" },
});
