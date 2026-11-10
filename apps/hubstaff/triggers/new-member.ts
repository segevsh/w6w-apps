import { ORGANIZATION_ID_PARAM, snapshotFeed } from "../lib/triggers.ts";
import action from "../actions/member-list.ts";

/** `GET /v2/organizations/{id}/members` — memberships are keyed by their `user_id`. */
export default snapshotFeed({
  key: "new-member",
  title: "New Member",
  description: "The run gets each person newly added to a Hubstaff organization.",
  action,
  params: [ORGANIZATION_ID_PARAM],
  input: ({ params, cursor, pageSize }) => ({
    organization_id: params.organizationId,
    page_limit: pageSize,
    page_start_id: cursor,
  }),
  items: (result) => (result as { members?: Array<Record<string, unknown>> }).members ?? [],
  idOf: (item) => String(item.user_id ?? ""),
  output: [
    { key: "user_id", type: "number", label: "User ID" },
    { key: "membership_role", type: "string", label: "Role" },
    { key: "membership_status", type: "string", label: "Membership status" },
    { key: "created_at", type: "string", label: "Joined at" },
  ],
  sample: {
    user_id: 651956,
    membership_role: "user",
    membership_status: "active",
    created_at: "2026-11-09T10:00:00Z",
  },
});
