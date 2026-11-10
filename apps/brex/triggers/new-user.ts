import userList from "../actions/user-list.ts";
import { newRecordTrigger } from "../lib/snapshots.ts";

/**
 * `GET /v2/users` has no sort or since filter, so every check reads the whole directory (`limit`
 * 1000, `cursor` paging, at most 5000 users) and diffs the ids.
 * https://developer.brex.com/openapi/team_api/users/listusers.md (verified 2026-11-10)
 */
export default newRecordTrigger({
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to your Brex account.",
  action: userList,
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: {
    id: "cuuser_sample0001",
    first_name: "Sample",
    last_name: "Person",
    email: "sample.person@example.com",
    status: "ACTIVE",
  },
});
