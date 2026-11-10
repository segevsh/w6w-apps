import { ORGANIZATION_ID_PARAM, snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/client-list.ts";

/** `GET /v2/organizations/{id}/clients` with `status=all` (archived ones included, so un-archiving is not "new"). */
export default snapshotFeed({
  key: "new-client",
  title: "New Client",
  description: "The run gets each client newly created in a Hubstaff organization.",
  action,
  params: [ORGANIZATION_ID_PARAM],
  input: ({ params, cursor, pageSize }) => ({
    organization_id: params.organizationId,
    status: "all",
    page_limit: pageSize,
    page_start_id: cursor,
  }),
  items: (result) => (result as { clients?: Array<Record<string, unknown>> }).clients ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "emails", type: "array", label: "Emails" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 31,
    name: "Acme Ltd",
    status: "active",
    emails: ["billing@example.com"],
    created_at: "2026-11-09T10:00:00Z",
  },
});
