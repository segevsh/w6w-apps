import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import connectionList from "../actions/connection-list.ts";

// WorkOS: GET /connections
// `order=desc` is "ordered by the creation time", newest first (https://workos.com/docs/reference/sso/connection/list, verified 2026-11-10).
// Newest-first, brief 9.1 a.
export default pollFromListAction<{ organizationId?: string }>({
  key: "new-connection",
  title: "New SSO Connection",
  description: "The run gets each newly created SSO connection, optionally for one organization.",
  action: connectionList as unknown as ActionDefinition,
  input: ({ organizationId }) => ({ organizationId, order: "desc", limit: 50 }),
  items: (result) => (result as { connections?: unknown[] }).connections ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "organizationId", label: "Organization ID", type: "string" }],
  output: [
    { key: "id", type: "string", label: "Connection ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "connection_type", type: "string", label: "Connection type" },
    { key: "state", type: "string", label: "State" },
    { key: "organization_id", type: "string", label: "Organization ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "conn_01SAMPLE",
    name: "Acme SSO",
    connection_type: "OktaSAML",
    state: "draft",
    organization_id: "org_01SAMPLE",
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
