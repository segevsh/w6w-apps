import { snapshotFeed } from "../lib/triggers.ts";
import userList from "../actions/user-list.ts";

/**
 * Wraps `user-list` (`GET /api/v2/users`, `page[number]` zero-based + `page[size]` up to 100,
 * ordered by `name` so the pages are stable). The endpoint orders by name, modified time or user
 * count but never by creation, so the users are walked and diffed.
 */
export default snapshotFeed({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Datadog organization.",
  action: userList,
  pageSize: 100,
  input: ({ cursor, pageSize }) => ({ pageNumber: cursor, pageSize, sort: "name" }),
  items: (result) => (result as { data?: Array<Record<string, unknown>> }).data ?? [],
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "type", type: "string", label: "Resource type (users)" },
    { key: "attributes", type: "object", label: "Name, email, handle, status, created_at" },
  ],
  sample: {
    id: "00000000-0000-0000-0000-000000000001",
    type: "users",
    attributes: {
      name: "Example Name",
      email: "user@example.com",
      handle: "user@example.com",
      status: "Pending",
      created_at: "2026-11-09T10:00:00+00:00",
    },
  },
});
