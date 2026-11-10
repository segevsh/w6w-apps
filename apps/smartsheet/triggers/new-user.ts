import listUsers from "../actions/list-users.ts";
import { readPages, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c). `GET /users` lists the organization account's users (System Admin
 * rights are needed for the full list) with `page`/`pageSize` and no documented order; the roster is a
 * seat-limited set, read whole (up to 10 pages of 100)
 * (https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml, `list-users`).
 */
export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Smartsheet organization account.",
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: 48569348493401200,
    email: "ada@example.com",
    name: "Ada Lovelace",
    status: "ACTIVE",
  },
  rows: (_p, ctx) => readPages("new-user", listUsers, {}, ctx),
  idOf: (r) => String(r.id),
});
