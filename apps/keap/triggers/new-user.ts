import userList from "../actions/user-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new Keap user, newest first (`GET /rest/v2/users`, `order_by=create_time desc`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each new Keap user, newest first (`GET /rest/v2/users`, `order_by=create_time desc`).",
  action: userList,
  list: "users",
  orderBy: "create_time desc",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "given_name", type: "string", label: "First name" },
    { key: "family_name", type: "string", label: "Last name" },
    { key: "create_time", type: "string", label: "Created at" },
  ],
  sample: {
    id: "7",
    given_name: "Pat",
    family_name: "Example",
    create_time: "2026-11-10T12:00:00.000Z",
  },
});
