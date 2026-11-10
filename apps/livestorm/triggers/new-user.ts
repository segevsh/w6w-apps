import userList from "../actions/user-list.ts";
import { boundedList } from "../lib/triggers.ts";

/**
 * `GET /v1/users` — the workspace's team members. The endpoint documents no paging, sort or since
 * filter (https://developers.livestorm.co/reference/get_users, verified 2026-11-10); a workspace's
 * team is a small bounded collection, read whole and compared check to check.
 */
export default boundedList({
  key: "new-user",
  title: "New User",
  description: "The run gets each team member newly added to the Livestorm workspace.",
  action: userList,
  paged: false,
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "User attributes (email, role, …)" },
  ],
  sample: {
    id: "1a2b3c4d-6666-4a2b-9d3e-0a1b2c3d4e5f",
    type: "users",
    attributes: { email: "grace@example.test", role: "admin" },
  },
});
